/**
 * Command registry for the KAM dev palette.
 *
 * Each command is a handler that does its work and optionally returns a
 * `CommandOutcome` describing the post-action to run after successful
 * execution:
 *   1. refresh target keys (run in order; missing target is an error)
 *   2. klog lines (written last; final post-action)
 *
 * Commands that don't need a post-action return `void`.
 */

import {
  clearCommandAliases,
  getCommandAliases,
  listCommandAliases,
  normalizeAliasShortcut,
  removeCommandAlias,
  setCommandAlias,
} from "../client/consoleUi.svelte";
import {
  devConsole,
  fetchDbStatus,
  klogError,
  klogWithSource,
  type KlogLevel,
} from "./state.svelte";
import { listRefreshTargets, runRefreshTarget } from "./refresh";

export type CommandOutcome = {
  refresh?: string[];
  log?: string | string[];
  level?: KlogLevel;
};

export type CommandHandler = (
  args: string[],
) => CommandOutcome | void | Promise<CommandOutcome | void>;

export type CommandResult = { ok: true } | { ok: false; error: string };

const KICKAGENT_NS = "kickagent:";
const MAX_ALIAS_CHAIN = 8;

const commands = new Map<string, CommandHandler>();

function assertAliasShortcutNotShadowingBuiltin(shortcutRaw: string): void {
  const key = normalizeAliasShortcut(shortcutRaw);
  if (!key) {
    throw new Error(
      "alias: invalid shortcut (cannot shadow built-in or reserved names)",
    );
  }
  if (commands.has(key)) {
    throw new Error(
      `alias: "${key}" is already a command name — pick a different shortcut (stuck? try unalias --all)`,
    );
  }
}

export function registerCommand(name: string, handler: CommandHandler): void {
  commands.set(name.toLowerCase(), handler);
}

export function registerKickagentCommand(
  shortName: string,
  handler: CommandHandler,
): void {
  registerCommand(`${KICKAGENT_NS}${shortName}`, handler);
}

/** Remove all `kickagent:*` handlers (before Phase 2 reload). */
export function clearKickagentCommands(): void {
  for (const key of [...commands.keys()]) {
    if (key.startsWith(KICKAGENT_NS)) {
      commands.delete(key);
    }
  }
}

export function listCommands(): string[] {
  return [...commands.keys()].sort();
}

export function listKickagentShortNames(): string[] {
  return listCommands()
    .filter((name) => name.startsWith(KICKAGENT_NS))
    .map((name) => name.slice(KICKAGENT_NS.length));
}

/**
 * Resolve user-defined alias chain on a single command token; inject leading
 * args from the expansion (e.g. ka → shell kickagent).
 */
function expandAliasLeading(
  firstToken: string,
  restArgs: string[],
): [string, string[]] {
  let head = firstToken.toLowerCase();
  const aliases = getCommandAliases();
  const injected: string[] = [];
  let depth = 0;
  const visited = new Set<string>();
  while (depth++ < MAX_ALIAS_CHAIN) {
    if (visited.has(head)) break;
    visited.add(head);
    const expansion = aliases[head];
    if (!expansion) break;
    const parts = expansion.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) break;
    head = parts[0]!.toLowerCase();
    injected.push(...parts.slice(1));
  }
  return [head, [...injected, ...restArgs]];
}

/**
 * Qualified subscriber/host style: `prefix:rest`. Expand alias chain on `prefix`
 * only; if the expansion is a single head token (no injected args), rewrite to
 * `head:rest` so e.g. `ka:hello` → `kickagent:hello` when `ka` → `kickagent`.
 */
function expandQualifiedCommandToken(qualifiedLower: string): string {
  const idx = qualifiedLower.indexOf(":");
  if (idx <= 0) return qualifiedLower;
  const prefix = qualifiedLower.slice(0, idx);
  const suffix = qualifiedLower.slice(idx + 1);
  if (!suffix || prefix.includes(":")) return qualifiedLower;
  const [head, injected] = expandAliasLeading(prefix, []);
  if (injected.length > 0) return qualifiedLower;
  return `${head}:${suffix}`;
}

function resolveCommandName(rawName: string): string | null {
  const lower = rawName.toLowerCase();

  // Host / publicweb namespace escape: `:name` resolves only to registry keys (never kickagent:name).
  // In kickagent mode, bare names resolve only under kickagent:.
  // Qualified names like `kickagent:hello` work in any mode.
  if (lower.startsWith(":")) {
    const hostName = lower.slice(1);
    if (!hostName) return null;
    return commands.has(hostName) ? hostName : null;
  }

  if (lower.includes(":")) {
    return commands.has(lower) ? lower : null;
  }

  if (devConsole.kamMode === "kickagent") {
    const prefixed = `${KICKAGENT_NS}${lower}`;
    if (commands.has(prefixed)) return prefixed;
    return null;
  }

  return commands.has(lower) ? lower : null;
}

function logLines(outcome: CommandOutcome | void, source: string): void {
  if (!outcome || outcome.log === undefined) return;
  const level: KlogLevel = outcome.level ?? "log";
  const lines = Array.isArray(outcome.log) ? outcome.log : [outcome.log];
  for (const line of lines) {
    if (line === undefined || line === null) continue;
    klogWithSource(level, source, String(line));
  }
}

export async function runCommand(input: string): Promise<CommandResult> {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: "empty command" };

  const [rawToken, ...args] = trimmed.split(/\s+/);
  if (!rawToken) return { ok: false, error: "empty command" };

  const lw = rawToken.toLowerCase();
  let cmdToken: string;
  let mergedArgs: string[];

  if (lw.startsWith(":")) {
    const inner = lw.slice(1);
    if (!inner) {
      const msg = "empty command";
      klogError(msg);
      return { ok: false, error: msg };
    }
    const afterQualified = expandQualifiedCommandToken(inner);
    const [h, pre] = expandAliasLeading(afterQualified, []);
    cmdToken = `:${h}`;
    mergedArgs = [...pre, ...args];
  } else if (!lw.includes(":")) {
    const [h, pre] = expandAliasLeading(lw, args);
    cmdToken = h;
    mergedArgs = pre;
  } else {
    cmdToken = expandQualifiedCommandToken(lw);
    mergedArgs = args;
  }

  let resolved = resolveCommandName(cmdToken);
  if (
    !resolved &&
    devConsole.kamMode !== "kickagent" &&
    !lw.startsWith(":") &&
    !lw.includes(":") &&
    cmdToken.toLowerCase() === "kickagent" &&
    mergedArgs.length === 0
  ) {
    const outcome = enterKickagentShell();
    logLines(outcome, "command:shell");
    return { ok: true };
  }
  if (!resolved) {
    const hint =
      devConsole.kamMode === "kickagent"
        ? " — try :help for publicweb commands"
        : "";
    const msg = `unknown command: ${rawToken}${hint}`;
    klogError(msg);
    return { ok: false, error: msg };
  }

  const source = `command:${resolved}`;
  const handler = commands.get(resolved)!;

  let outcome: CommandOutcome | void;
  try {
    outcome = await handler(mergedArgs);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    klogWithSource("error", source, `${resolved}: ${msg}`);
    return { ok: false, error: msg };
  }

  const refreshTargets = outcome?.refresh ?? [];
  for (const target of refreshTargets) {
    try {
      const ok = await runRefreshTarget(target);
      if (!ok) {
        const msg = `unknown refresh target: ${target}`;
        klogWithSource("error", source, msg);
        return { ok: false, error: msg };
      }
      klogWithSource("info", source, `refreshed ${target}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      klogWithSource("error", source, `refresh ${target} failed: ${msg}`);
      return { ok: false, error: msg };
    }
  }

  logLines(outcome, source);
  return { ok: true };
}

registerCommand("console", (): CommandOutcome => {
  devConsole.toggleConsole();
  return { log: `console ${devConsole.consoleOpen ? "opened" : "closed"}` };
});

registerCommand("clear", () => {
  devConsole.clear();
});

registerCommand("help", (): CommandOutcome => {
  const blocks: string[] = [];
  if (devConsole.kamMode === "kickagent") {
    blocks.push(
      "kickagent shell: on — bare names are kickagent: only; use :help, :exit, :shell default, :clear for publicweb (e.g. :reset --all-parsed)",
    );
    const globals = listCommands().filter((c) => !c.startsWith(KICKAGENT_NS));
    blocks.push(
      `publicweb commands (use : prefix): ${globals.map((c) => `:${c}`).join(", ")}`,
    );
    const shorts = listKickagentShortNames();
    if (shorts.length > 0) {
      blocks.push(
        `kickagent commands: ${shorts.map((s) => `${s} (→ ${KICKAGENT_NS}${s})`).join(", ")}`,
      );
    }
  } else {
    const host = listCommands().filter((c) => !c.startsWith(KICKAGENT_NS));
    const subs = listCommands().filter((c) => c.startsWith(KICKAGENT_NS));

    blocks.push(`Host: ${host.join(", ")}`);
    if (subs.length > 0) {
      blocks.push(`Subscriber: ${subs.join(", ")}`);
    }
    blocks.push(
      "[KA] shell: off — enter: shell kickagent, shell <shortcut>, or a bare shortcut that expands to kickagent (alias / details: docs/guides/kam-console.md).",
    );

    const als = listCommandAliases();
    if (als.length > 0) {
      blocks.push(
        `Shortcuts: ${als.map((a) => `${a.shortcut} → ${a.expansion}`).join("; ")}`,
      );
    }
    blocks.push(
      "Aliases: run alias (no args) to list; alias kickagent <s>; unalias / unalias --all; alias --clear.",
    );
  }
  blocks.push(
    "Hotkey: Ctrl+/ (⌘+/) — palette · ` (backtick) — KAM Console pane",
  );
  blocks.push("Database: db status · db use dev|prod (super only, local dev)");
  const targets = listRefreshTargets();
  if (targets.length > 0) {
    blocks.push(`Refresh targets: ${targets.join(", ")}`);
  }
  return { log: blocks.join("\n\n") };
});

registerCommand("echo", (args): CommandOutcome => {
  return { log: args.join(" ") };
});

registerCommand("alias", (args): CommandOutcome => {
  if (args.length === 0) {
    const list = listCommandAliases();
    if (list.length === 0) {
      return {
        log: "no aliases (usage: alias <shortcut> <expansion…> | alias kickagent <shortcut> | alias --clear)",
        level: "info",
      };
    }
    return {
      log: list.map((a) => `${a.shortcut} → ${a.expansion}`).join("\n"),
      level: "info",
    };
  }
  if (args.length === 1 && args[0] === "--clear") {
    const n = listCommandAliases().length;
    clearCommandAliases();
    return {
      log:
        n > 0
          ? `alias: cleared ${n} saved alias(es)`
          : "alias: no aliases to clear",
      level: "info",
    };
  }
  if (args.length === 2 && args[0]!.toLowerCase() === "kickagent") {
    assertAliasShortcutNotShadowingBuiltin(args[1]!);
    setCommandAlias(args[1]!, "shell kickagent");
    return {
      log: `alias: ${args[1]} → shell kickagent`,
      level: "info",
    };
  }
  if (args.length < 2) {
    throw new Error(
      "usage: alias <shortcut> <expansion…> | alias kickagent <shortcut>",
    );
  }
  const shortcut = args[0]!;
  const expansion = args.slice(1).join(" ");
  assertAliasShortcutNotShadowingBuiltin(shortcut);
  setCommandAlias(shortcut, expansion);
  return { log: `alias: ${shortcut} → ${expansion}`, level: "info" };
});

registerCommand("unalias", (args): CommandOutcome => {
  const raw = args[0]?.trim();
  if (!raw) {
    throw new Error("usage: unalias <shortcut> | unalias --all");
  }
  if (raw.toLowerCase() === "--all" || raw === "*") {
    const n = listCommandAliases().length;
    clearCommandAliases();
    return {
      log:
        n > 0
          ? `unalias: cleared ${n} alias(es)`
          : "unalias: no aliases to clear",
      level: "info",
    };
  }
  removeCommandAlias(args[0]!);
  return { log: `unalias: removed ${args[0]}`, level: "info" };
});

/** Leave active namespace shell (:exit in KA shell). */
registerCommand("exit", (): CommandOutcome => {
  if (devConsole.kamMode !== "kickagent") {
    return {
      log: "not in kickagent shell — use shell kickagent (or alias kickagent <shortcut>)",
      level: "info",
    };
  }
  devConsole.kamMode = "default";
  return { log: "shell: default (left KA mode)", level: "info" };
});

function enterKickagentShell(): CommandOutcome {
  devConsole.kamMode = "kickagent";
  return { log: "shell: kickagent ([KA] mode on)", level: "info" };
}

/**
 * First arg to `shell …`, after alias expansion. Supports e.g. `shell ka` when
 * `ka` → `kickagent`, or when `ka` → `shell kickagent` (same stored form as
 * `alias kickagent ka`).
 */
function resolveShellSubcommand(firstArg: string): "kickagent" | "default" | "off" | null {
  const trimmed = firstArg.trim().toLowerCase();
  if (!trimmed) return null;
  const [headRaw, injected] = expandAliasLeading(trimmed, []);
  const head = headRaw.toLowerCase();
  const inj = injected.map((t) => t.toLowerCase());

  if (inj.length === 0) {
    if (head === "kickagent" || head === "default" || head === "off") return head;
    return null;
  }
  if (inj.length === 1 && head === "shell") {
    const sub = inj[0]!;
    if (sub === "kickagent" || sub === "default" || sub === "off") return sub;
  }
  return null;
}

/** Host shell / namespace; `kickagent:` remains the subscriber command prefix only. */
registerCommand("shell", (args): CommandOutcome => {
  const raw = args[0]?.trim();
  if (!raw) {
    throw new Error(
      "usage: shell kickagent | shell default | shell off (or a shortcut that expands to one of these)",
    );
  }
  const sub = resolveShellSubcommand(raw);
  if (!sub) {
    throw new Error(
      "usage: shell kickagent | shell default | shell off (or a shortcut that expands to one of these)",
    );
  }
  if (sub === "kickagent") {
    return enterKickagentShell();
  }
  devConsole.kamMode = "default";
  return { log: "shell: default (left KA mode)", level: "info" };
});

registerCommand("reset", async (args): Promise<CommandOutcome> => {
  const target = args[0]?.trim();
  if (!target) {
    throw new Error("usage: reset <vendor> | reset --all-parsed");
  }

  const allParsed = target === "--all-parsed";
  const vendor = allParsed ? "" : target;

  const res = await fetch("/api/admin/bills/reset", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(allParsed ? { allParsed: true } : { vendor }),
  });

  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    /* ignore; handled below */
  }

  if (!res.ok) {
    const msg =
      payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message?: unknown }).message ?? "reset failed")
        : "reset failed";
    throw new Error(msg);
  }

  const updatedCount =
    payload && typeof payload === "object" && "updatedCount" in payload
      ? Number((payload as { updatedCount?: unknown }).updatedCount ?? 0)
      : 0;
  const safeCount = Number.isFinite(updatedCount) ? updatedCount : 0;

  const scope = allParsed ? "all parsed documents" : `vendor "${vendor}"`;
  return {
    refresh: ["bills.recent-docs"],
    log: `reset complete for ${scope} — ${safeCount} document(s) moved parsed -> received`,
  };
});

type DbApiStatus = {
  target: "dev" | "prod";
  label: string;
  host: string;
  database: string;
  canSwitch: boolean;
};

async function fetchDbApiStatus(): Promise<DbApiStatus> {
  const res = await fetch("/api/dev/database", { credentials: "same-origin" });
  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    /* handled below */
  }
  if (!res.ok) {
    const msg =
      payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message?: unknown }).message ?? "db status failed")
        : "db status failed (sign in required)";
    throw new Error(msg);
  }
  return payload as DbApiStatus;
}

registerCommand("db", async (args): Promise<CommandOutcome> => {
  const sub = args[0]?.toLowerCase();

  if (!sub || sub === "status") {
    const status = await fetchDbApiStatus();
    await fetchDbStatus();
    const lines = [
      `target: ${status.target}`,
      `label: ${status.label}`,
      `host: ${status.host}`,
      `database: ${status.database}`,
      status.canSwitch
        ? "switch: db use dev | db use prod (super only)"
        : "switch: disabled (production or DATABASE_URL_DEV unset)",
    ];
    return {
      log: lines.join("\n"),
      level: status.target === "prod" ? "warn" : "info",
    };
  }

  if (sub === "use") {
    const target = args[1]?.toLowerCase();
    if (target !== "dev" && target !== "prod") {
      throw new Error("usage: db use dev | db use prod");
    }

    const warnLines: string[] = [];
    if (target === "prod") {
      warnLines.push(
        "⚠ switching to PRODUCTION database — migrations and writes affect live data",
      );
    }

    const res = await fetch("/api/dev/database", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ target }),
    });

    let payload: unknown = null;
    try {
      payload = await res.json();
    } catch {
      /* handled below */
    }

    if (!res.ok) {
      const msg =
        payload && typeof payload === "object" && "message" in payload
          ? String((payload as { message?: unknown }).message ?? "db switch failed")
          : "db switch failed";
      throw new Error(msg);
    }

    const status = payload as DbApiStatus;
    await fetchDbStatus();
    return {
      refresh: ["app.db"],
      log: [...warnLines, `database: ${status.label}`].filter(Boolean),
      level: target === "prod" ? "warn" : "info",
    };
  }

  throw new Error("usage: db status | db use dev | db use prod");
});

registerCommand("kam:reload-kickagent", async (): Promise<CommandOutcome> => {
  const { reloadKickagentPluginFromManifest } = await import(
    "$lib/kickagent/loadPluginFromManifest"
  );
  const r = await reloadKickagentPluginFromManifest({ force: true });
  if (!r.ok) {
    throw new Error(r.error);
  }
  return {
    log: `kickagent plugin reloaded (manifest v${r.version})`,
    level: "info",
  };
});
