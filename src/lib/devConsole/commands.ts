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
import type { CommandOutcome } from "$lib/kickagent/contracts";

export type { CommandOutcome };
import { materializeDashboardCommand } from "../client/dashboardCommandMaterialize";
import {
  outcomeToTableModel,
  tableOutcomeMissingHint,
} from "$lib/kickagent/outcomeToTableModel";
import {
  executeHistoryCommand,
  expandHistoryBang,
  recordKamCommand,
  shouldSkipHistoryRecord,
} from "./commandHistory";
import { listRefreshTargets, runRefreshTarget } from "./refresh";

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
  void import("$lib/kickagent/manifestCommandCache").then((m) =>
    m.clearManifestCommandCache(),
  );
  void import("$lib/kickagent/manifestResourceCache").then((m) =>
    m.clearManifestResourceCache(),
  );
  devConsole.clearTableOutcome();
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

function kamPromptPrefix(): string {
  return devConsole.kickagentModeActive ? "[KA] >" : "›";
}

/** Echo the submitted command line in the console scrollback (terminal-style). */
function echoCommandInput(line: string): void {
  klogWithSource("log", "kam:prompt", `${kamPromptPrefix()} ${line}`);
}

export async function runCommand(input: string): Promise<CommandResult> {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: "empty command" };

  echoCommandInput(trimmed);

  let commandLine = trimmed;
  const bang = expandHistoryBang(trimmed);
  if (bang) {
    if (!bang.ok) {
      klogError(bang.error);
      return { ok: false, error: bang.error };
    }
    klogWithSource("info", "history", `${bang.event} → ${bang.expanded}`);
    commandLine = bang.expanded;
  }

  if (!shouldSkipHistoryRecord(commandLine)) recordKamCommand(commandLine);

  const [rawToken, ...args] = commandLine.split(/\s+/);
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
  maybeStashTableOutcome(outcome);
  if (resolved.startsWith(KICKAGENT_NS)) {
    void materializeDashboardCommand(resolved);
  }
  return { ok: true };
}

function maybeStashTableOutcome(outcome: CommandOutcome | void): void {
  if (!outcome) return;
  const model = outcomeToTableModel(outcome);
  if (model) {
    devConsole.setTableOutcome(model);
    return;
  }
  const hint = tableOutcomeMissingHint(outcome);
  if (hint) {
    klogWithSource("warn", "kickagent:table", hint);
  }
}

registerCommand("console", (): CommandOutcome => {
  devConsole.toggleConsole();
  return { log: `console ${devConsole.consoleOpen ? "opened" : "closed"}` };
});

registerCommand("clear", () => {
  devConsole.clear();
  devConsole.clearTableOutcome();
});

registerCommand("help", (): CommandOutcome => {
  const blocks: string[] = [];
  if (devConsole.kamMode === "kickagent") {
    blocks.push(
      "kickagent shell: on — bare names are kickagent: only; use :help, :exit, :shell default, :clear for publicweb",
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
    "History: history · !n / !! / !-n / !prefix · history -c · history -d <n> · ↑/↓ recall",
  );
  blocks.push(
    "Hotkey: Ctrl+/ (⌘+/) — palette · ` (backtick) — KAM Console pane",
  );
  blocks.push(
    "Database: db status · db tables · db migrations · db use dev|prod (super only, local dev)",
  );
  const targets = listRefreshTargets();
  if (targets.length > 0) {
    blocks.push(`Refresh targets: ${targets.join(", ")}`);
  }
  return { log: blocks.join("\n\n") };
});

registerCommand("echo", (args): CommandOutcome => {
  return { log: args.join(" ") };
});

registerCommand("history", (args): CommandOutcome => {
  const result = executeHistoryCommand(args);
  if (!result.ok) {
    return { log: result.error, level: "error" };
  }
  if (result.kind === "cleared") {
    return { log: "history cleared", level: "log" };
  }
  if (result.kind === "deleted") {
    return {
      log: `history: deleted line ${result.lineNumber} (${result.removed})`,
      level: "log",
    };
  }
  if (result.lines.length === 0) {
    return {
      log: "(no history yet — run commands first, then use !n to repeat)",
      level: "log",
    };
  }
  const footer = "\n\n(re-run with !n, !!, !-n, or !prefix · history -d <n> to delete)";
  return { log: result.lines.join("\n") + footer, level: "log" };
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

type DbApiStatus = {
  target: "dev" | "prod";
  label: string;
  host: string;
  database: string;
  canSwitch: boolean;
  connected?: boolean;
  connectedError?: string;
};

type DbTablesPayload = {
  tables: Array<{ schema: string; name: string; approxRows: number | null }>;
};

type DbMigrationsPayload = {
  state: "ok" | "pending" | "unavailable";
  journalCount: number;
  appliedCount: number;
  pendingCount: number;
  pendingTags: string[];
};

async function fetchDevDbJson<T>(path: string): Promise<T> {
  const res = await fetch(path, { credentials: "same-origin" });
  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    /* handled below */
  }
  if (!res.ok) {
    const msg =
      payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message?: unknown }).message ?? `${path} failed`)
        : `${path} failed`;
    throw new Error(msg);
  }
  return payload as T;
}

function formatDbTables(payload: DbTablesPayload): string {
  if (payload.tables.length === 0) {
    return "(no tables in public or drizzle schemas)";
  }
  const schemaW = Math.max(6, ...payload.tables.map((t) => t.schema.length));
  const nameW = Math.max(5, ...payload.tables.map((t) => t.name.length));
  const lines = [
    `${"schema".padEnd(schemaW)}  ${"table".padEnd(nameW)}  ~rows`,
    ...payload.tables.map((t) => {
      const rows =
        t.approxRows === null || Number.isNaN(t.approxRows)
          ? "—"
          : String(Math.round(t.approxRows));
      return `${t.schema.padEnd(schemaW)}  ${t.name.padEnd(nameW)}  ${rows}`;
    }),
  ];
  return lines.join("\n");
}

function formatDbMigrations(payload: DbMigrationsPayload): string {
  if (payload.state === "unavailable") {
    return [
      "migrations: unavailable",
      "(check DATABASE_URL / journal / DB is running)",
    ].join("\n");
  }
  const lines = [
    payload.state === "pending"
      ? `migrations: pending:${payload.pendingCount}`
      : "migrations: ok",
    `journal: ${payload.journalCount}  applied: ${payload.appliedCount}  pending: ${payload.pendingCount}`,
  ];
  if (payload.pendingTags.length > 0) {
    lines.push("pending:");
    for (const tag of payload.pendingTags) {
      lines.push(`  ${tag}`);
    }
    lines.push("(run: pnpm db:migrate)");
  }
  return lines.join("\n");
}

async function fetchDbApiStatus(): Promise<DbApiStatus> {
  return fetchDevDbJson<DbApiStatus>("/api/dev/database");
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
      status.connected === false
        ? `connected: failed — ${status.connectedError ?? "unknown"}`
        : status.connected === true
          ? "connected: ok"
          : "connected: unknown",
      status.canSwitch
        ? "switch: db use dev | db use prod (super only)"
        : "switch: disabled (production or DATABASE_URL_DEV unset)",
    ];
    return {
      log: lines.join("\n"),
      level:
        status.target === "prod" || status.connected === false ? "warn" : "info",
    };
  }

  if (sub === "tables") {
    const payload = await fetchDevDbJson<DbTablesPayload>("/api/dev/database/tables");
    return { log: formatDbTables(payload), level: "log" };
  }

  if (sub === "migrations" || sub === "migrate") {
    if (sub === "migrate") {
      return {
        log: "db migrate is not available in KAM — use: pnpm db:migrate (dev) or pnpm db:migrate --db prod",
        level: "warn",
      };
    }
    const payload = await fetchDevDbJson<DbMigrationsPayload>(
      "/api/dev/database/migrations",
    );
    return {
      log: formatDbMigrations(payload),
      level: payload.state === "pending" ? "warn" : "info",
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

  throw new Error(
    "usage: db status | db tables | db migrations | db use dev | db use prod",
  );
});

registerCommand("kam:reload-kickagent", async (): Promise<CommandOutcome> => {
  const { reloadKickagentPluginFromManifest } = await import(
    "$lib/kickagent/loadPluginFromManifest"
  );
  const r = await reloadKickagentPluginFromManifest({ force: true });
  if (!r.ok) {
    throw new Error(r.error);
  }
  const resourceNote = r.resourcesCached
    ? "resources.units.list cached"
    : "WARNING: no resources.units.list in manifest — deploy kickagent ≥ 0.0.3";
  return {
    log: `kickagent plugin reloaded (manifest v${r.version}; ${resourceNote})`,
    level: r.resourcesCached ? "info" : "warn",
  };
});
