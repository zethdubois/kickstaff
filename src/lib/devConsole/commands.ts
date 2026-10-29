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
 *
 * Bare words are host verbs. `<namespace>:<name>` belongs to a subscriber.
 * Enter a palette with the namespace (or its alias); leave with `:exit`.
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
  klogAt,
  klogError,
  klogWithSource,
  type KlogLevel,
} from "./state.svelte";
import type { CommandOutcome } from "$lib/kickagent/contracts";

export type { CommandOutcome };
import { materializeDashboardCommand } from "../client/dashboardCommandMaterialize";
import { listRowLines } from "./listRowLine";
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

const MAX_ALIAS_CHAIN = 8;
/** Default subscriber namespace until a manifest load sets another. */
const DEFAULT_SUBSCRIBER_NS = "kickagent";

type LoadedSubscriberMeta = {
  id: string;
  namespace: string;
  alias?: string;
};

let loadedSubscriber: LoadedSubscriberMeta | null = null;

const commands = new Map<string, CommandHandler>();

function subscriberNs(): string {
  return loadedSubscriber?.namespace ?? DEFAULT_SUBSCRIBER_NS;
}

function subscriberPrefix(): string {
  return `${subscriberNs()}:`;
}

export function setLoadedSubscriberMeta(meta: LoadedSubscriberMeta): void {
  loadedSubscriber = meta;
}

export function clearLoadedSubscriberMeta(): void {
  loadedSubscriber = null;
}

export function getLoadedSubscriberMeta(): LoadedSubscriberMeta | null {
  return loadedSubscriber;
}

/** Host registry keys only (no `namespace:` subscriber commands). */
export function listHostCommandNames(): string[] {
  return [...commands.keys()].filter((name) => !name.includes(":")).sort();
}

function assertAliasShortcutNotShadowingBuiltin(shortcutRaw: string): void {
  const key = normalizeAliasShortcut(shortcutRaw);
  if (!key) {
    throw new Error(
      "alias: invalid shortcut (cannot shadow built-in or reserved names)",
    );
  }
  if (commands.has(key)) {
    throw new Error(
      `alias: "${key}" is already a command name — pick a different shortcut (stuck? try alias --clear)`,
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
  registerCommand(`${subscriberPrefix()}${shortName}`, handler);
}

/** Remove all `<namespace>:*` handlers (before Phase 2 reload). */
export function clearKickagentCommands(): void {
  const prefixes = new Set([subscriberPrefix(), `${DEFAULT_SUBSCRIBER_NS}:`]);
  for (const key of [...commands.keys()]) {
    for (const p of prefixes) {
      if (key.startsWith(p)) {
        commands.delete(key);
        break;
      }
    }
  }
  void import("$lib/kickagent/manifestCommandCache").then((m) =>
    m.clearManifestCommandCache(),
  );
  void import("$lib/kickagent/manifestResourceCache").then((m) =>
    m.clearManifestResourceCache(),
  );
  if (
    devConsole.activeNamespace &&
    (devConsole.activeNamespace === loadedSubscriber?.namespace ||
      devConsole.activeNamespace === DEFAULT_SUBSCRIBER_NS)
  ) {
    devConsole.activeNamespace = "";
  }
  clearLoadedSubscriberMeta();
  devConsole.clearTableOutcome();
}

export function listCommands(): string[] {
  return [...commands.keys()].sort();
}

export function listKickagentShortNames(): string[] {
  const prefix = subscriberPrefix();
  return listCommands()
    .filter((name) => name.startsWith(prefix))
    .map((name) => name.slice(prefix.length));
}

/**
 * Resolve user-defined alias chain on a single command token; inject leading
 * args from the expansion (e.g. ka → kickagent).
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
  const ns = devConsole.activeNamespace;
  const prefix = ns ? `${ns}:` : subscriberPrefix();

  // Host escape: `:name` resolves only to registry keys (never namespace:name).
  if (lower.startsWith(":")) {
    const hostName = lower.slice(1);
    if (!hostName) return null;
    return commands.has(hostName) ? hostName : null;
  }

  if (lower.includes(":")) {
    return commands.has(lower) ? lower : null;
  }

  if (ns) {
    const prefixed = `${prefix}${lower}`;
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

function promptPrefix(): string {
  const ns = devConsole.activeNamespace;
  if (!ns) return "›";
  return ns === "kickagent" ? "[KA] >" : `[${ns}] >`;
}

/** Echo the submitted command line in the console scrollback (terminal-style). */
function echoCommandInput(line: string): void {
  klogWithSource("log", "host:prompt", `${promptPrefix()} ${line}`);
}

function isLoadedNamespace(token: string): boolean {
  const ns = loadedSubscriber?.namespace ?? DEFAULT_SUBSCRIBER_NS;
  return token === ns;
}

function enterSubscriberPalette(namespace: string): CommandOutcome {
  const ns = namespace.trim().toLowerCase();
  if (!ns) {
    return { log: "load a subscriber first (load kickagent)", level: "warn" };
  }
  const prefix = `${ns}:`;
  const hasCmds = [...commands.keys()].some((k) => k.startsWith(prefix));
  if (!hasCmds && !isLoadedNamespace(ns)) {
    return {
      log: `no commands for namespace "${ns}" — run load kickagent first`,
      level: "warn",
    };
  }
  devConsole.activeNamespace = ns;
  return {
    log: `palette: ${ns}${ns === "kickagent" ? " ([KA])" : ""}`,
    level: "info",
  };
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

  // Bare namespace (or alias → namespace) with no args enters that palette.
  if (
    !resolved &&
    !devConsole.activeNamespace &&
    !lw.startsWith(":") &&
    !lw.includes(":") &&
    mergedArgs.length === 0 &&
    isLoadedNamespace(cmdToken.toLowerCase())
  ) {
    const outcome = enterSubscriberPalette(cmdToken.toLowerCase());
    logLines(outcome, "command:load");
    return { ok: true };
  }

  if (!resolved) {
    const hint = devConsole.activeNamespace
      ? " — try :help for host commands"
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

  logCommandOutput(outcome, source);
  if (resolved.includes(":")) {
    void materializeDashboardCommand(resolved);
  }
  return { ok: true };
}

/**
 * One command result: the summary log, then each `data.rows` line.
 * Every line shares one timestamp so the console clocks the return, not each row.
 */
function logCommandOutput(outcome: CommandOutcome | void, source: string): void {
  devConsole.clearTableOutcome();
  if (!outcome) return;
  const ts = Date.now();
  const level: KlogLevel = outcome.level ?? "log";
  if (outcome.log !== undefined) {
    const lines = Array.isArray(outcome.log) ? outcome.log : [outcome.log];
    for (const line of lines) {
      if (line === undefined || line === null) continue;
      klogAt(level, source, String(line), ts);
    }
  }
  for (const line of listRowLines(outcome.data) ?? []) {
    klogAt("log", source, line, ts);
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
  const ns = devConsole.activeNamespace;
  const prefix = subscriberPrefix();
  if (ns) {
    blocks.push(
      `${ns} palette: on — bare names are ${ns}: only; use :help, :exit, :clear for host`,
    );
    const globals = listCommands().filter((c) => !c.startsWith(prefix));
    blocks.push(
      `host commands (use : prefix): ${globals.map((c) => `:${c}`).join(", ")}`,
    );
    const shorts = listKickagentShortNames();
    if (shorts.length > 0) {
      blocks.push(
        `${ns} commands: ${shorts.map((s) => `${s} (→ ${prefix}${s})`).join(", ")}`,
      );
    }
  } else {
    const host = listCommands().filter((c) => !c.includes(":"));
    const subs = listCommands().filter((c) => c.includes(":"));

    blocks.push(`Host: ${host.join(", ")}`);
    if (subs.length > 0) {
      blocks.push(`Subscriber: ${subs.join(", ")}`);
    }
    blocks.push(
      "Palette: off — enter with kickagent (or alias), leave with :exit. Load: load | load kickagent | load --list.",
    );

    const als = listCommandAliases();
    if (als.length > 0) {
      blocks.push(
        `Shortcuts: ${als.map((a) => `${a.shortcut} → ${a.expansion}`).join("; ")}`,
      );
    }
    blocks.push(
      "Aliases: alias (list) · alias kickagent <s> · alias <s> <expansion…> · alias --remove <s> · alias --clear",
    );
  }
  blocks.push(
    "History: history · !n / !! / !-n / !prefix · history -c · history -d <n> · ↑/↓ recall",
  );
  blocks.push(
    "Hotkey: Ctrl+/ (⌘+/) — palette · ` (backtick) — KAM Console pane",
  );
  blocks.push(
    "Database: db status · db tables · db migrations (admin) · db use dev|staging|prod (local dev; each DB needs its own sign-in)",
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
        log: "no aliases (usage: alias <shortcut> <expansion…> | alias kickagent <shortcut> | alias --remove <shortcut> | alias --clear)",
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
  if (
    args.length >= 2 &&
    (args[0] === "--remove" || args[0] === "-r" || args[0] === "--delete")
  ) {
    const shortcut = args[1]!;
    if (args.length > 2) {
      throw new Error("usage: alias --remove <shortcut>");
    }
    removeCommandAlias(shortcut);
    return { log: `alias: removed ${shortcut}`, level: "info" };
  }
  if (args.length === 2 && args[0]!.toLowerCase() === "kickagent") {
    assertAliasShortcutNotShadowingBuiltin(args[1]!);
    setCommandAlias(args[1]!, "kickagent");
    return {
      log: `alias: ${args[1]} → kickagent`,
      level: "info",
    };
  }
  if (args.length < 2) {
    throw new Error(
      "usage: alias <shortcut> <expansion…> | alias kickagent <shortcut> | alias --remove <shortcut> | alias --clear",
    );
  }
  const shortcut = args[0]!;
  const expansion = args.slice(1).join(" ");
  assertAliasShortcutNotShadowingBuiltin(shortcut);
  setCommandAlias(shortcut, expansion);
  return { log: `alias: ${shortcut} → ${expansion}`, level: "info" };
});

/** Leave active subscriber palette (:exit). */
registerCommand("exit", (): CommandOutcome => {
  if (!devConsole.activeNamespace) {
    return {
      log: "not in a subscriber palette — enter with kickagent (or alias)",
      level: "info",
    };
  }
  const left = devConsole.activeNamespace;
  devConsole.activeNamespace = "";
  return { log: `palette: host (left ${left})`, level: "info" };
});

registerCommand("load", async (args): Promise<CommandOutcome> => {
  const {
    loadSubscriber,
    loadAllSubscribers,
    listConfiguredSubscribers,
    getAppliedSubscriber,
    formatLoadStatusLine,
  } = await import("$lib/kickagent/loadPluginFromManifest");

  const tokens = args.map((a) => a.toLowerCase());
  const force = tokens.includes("--force");
  const listOnly = tokens.includes("--list");
  const idToken = tokens.find((t) => !t.startsWith("--"));

  if (listOnly) {
    const configured = listConfiguredSubscribers();
    if (configured.length === 0) {
      return {
        log: "load --list: no subscribers configured (set PUBLIC_KICKAGENT_MANIFEST_URL)",
        level: "warn",
      };
    }
    const lines = configured.map((s) => {
      const applied = getAppliedSubscriber(s.id);
      if (!applied) {
        return `${s.id}  (not loaded)  ${s.manifestUrl}`;
      }
      const res =
        applied.resourceKeys.length > 0
          ? applied.resourceKeys.join(",")
          : "-";
      return `${s.id}  v${applied.version}  sha ${applied.shaPrefix}…  cmds ${applied.commandCount}  resources ${res}`;
    });
    return { log: lines.join("\n"), level: "info" };
  }

  if (idToken) {
    const r = await loadSubscriber(idToken, { force });
    if (!r.ok) throw new Error(r.error);
    const lines = [formatLoadStatusLine(r)];
    if (r.aliasNote) lines.push(r.aliasNote);
    return {
      log: lines,
      level: r.resourcesCached || r.skipped ? "info" : "warn",
    };
  }

  const results = await loadAllSubscribers({ force });
  const lines: string[] = [];
  let level: KlogLevel = "info";
  for (const r of results) {
    if (!r.ok) {
      lines.push(r.error);
      level = "error";
      continue;
    }
    lines.push(formatLoadStatusLine(r));
    if (r.aliasNote) lines.push(r.aliasNote);
    if (!r.resourcesCached && !r.skipped) level = "warn";
  }
  if (lines.length === 0) {
    throw new Error("load: nothing configured");
  }
  if (level === "error" && results.every((r) => !r.ok)) {
    throw new Error(lines.join("\n"));
  }
  return { log: lines, level };
});

registerCommand("unload", async (args): Promise<CommandOutcome> => {
  const id = args[0]?.trim().toLowerCase();
  if (!id || args.length !== 1) {
    throw new Error("usage: unload <id>");
  }
  const { unloadSubscriber } = await import(
    "$lib/kickagent/loadPluginFromManifest"
  );
  const r = unloadSubscriber(id);
  if (!r.ok) throw new Error(r.error);
  return { log: `unloaded ${id}`, level: "info" };
});

type DbApiStatus = {
  target: "dev" | "staging" | "prod";
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
        ? "switch: db use dev | db use staging | db use prod (each DB needs its own sign-in)"
        : "switch: disabled (production or DATABASE_URL_DEV unset)",
    ];
    return {
      log: lines.join("\n"),
      level:
        status.target === "prod" ||
        status.target === "staging" ||
        status.connected === false
          ? "warn"
          : "info",
    };
  }

  if (sub === "tables") {
    const payload = await fetchDevDbJson<DbTablesPayload>("/api/dev/database/tables");
    return { log: formatDbTables(payload), level: "log" };
  }

  if (sub === "migrations" || sub === "migrate") {
    if (sub === "migrate") {
      return {
        log: "db migrate is not available in KAM — use: pnpm db:migrate (dev) or pnpm db:migrate --db staging|prod",
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
    if (target !== "dev" && target !== "staging" && target !== "prod") {
      throw new Error("usage: db use dev | db use staging | db use prod");
    }

    const warnLines: string[] = [];
    if (target === "prod") {
      warnLines.push(
        "⚠ switching to PRODUCTION database — migrations and writes affect live data",
      );
    }
    if (target === "staging") {
      warnLines.push(
        "⚠ switching to STAGING database — shared team test data",
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

    const status = payload as DbApiStatus & {
      hasSession?: boolean;
      loginUrl?: string;
    };

    const destination = status.hasSession
      ? window.location.pathname + window.location.search
      : (status.loginUrl ?? `/login?db=${target}`);
    const note = status.hasSession
      ? `signed in on ${target} — reloading…`
      : `no ${target} session — opening sign-in for ${target}…`;
    window.setTimeout(() => window.location.assign(destination), 600);

    return {
      log: [...warnLines, `database: ${status.label}`, note].filter(Boolean),
      level: target === "prod" || target === "staging" ? "warn" : "info",
    };
  }

  throw new Error(
    "usage: db status | db tables | db migrations | db use dev | db use staging | db use prod",
  );
});
