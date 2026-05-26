/**
 * KAM command-line history (bash-style): persisted in localStorage, shared by
 * palette and console inputs. ArrowUp/ArrowDown walk newest → oldest.
 */

export const KAM_COMMAND_HISTORY_KEY = "publicweb.kamCommandHistory";
export const KAM_COMMAND_HISTORY_VERSION = 1;
const MAX_ENTRIES = 500;

type StoredHistory = {
  version: number;
  entries: string[];
};

let entries: string[] = loadEntries();
/** -1 = "new" line (not browsing); otherwise index into `entries`. */
let browseIndex = -1;
let browseScratch = "";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function loadEntries(): string[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(KAM_COMMAND_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredHistory;
    if (parsed?.version !== KAM_COMMAND_HISTORY_VERSION || !Array.isArray(parsed.entries)) {
      return [];
    }
    return parsed.entries.filter((e) => typeof e === "string");
  } catch {
    return [];
  }
}

function persist(): void {
  if (!isBrowser()) return;
  try {
    const payload: StoredHistory = {
      version: KAM_COMMAND_HISTORY_VERSION,
      entries,
    };
    window.localStorage.setItem(KAM_COMMAND_HISTORY_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

/** Call when focus moves to a fresh input (palette open, etc.). */
export function resetHistoryNavigation(): void {
  browseIndex = -1;
  browseScratch = "";
}

/** Record a submitted command (non-empty, trimmed). */
export function recordKamCommand(raw: string): void {
  const line = raw.trim();
  if (!line) return;
  if (entries.length > 0 && entries[entries.length - 1] === line) return;
  entries.push(line);
  if (entries.length > MAX_ENTRIES) {
    entries = entries.slice(-MAX_ENTRIES);
  }
  persist();
  resetHistoryNavigation();
}

/**
 * ArrowUp: previous command (older in time as you keep pressing up).
 * Returns the value the input should show.
 */
export function historyNavigateUp(currentInput: string): string {
  if (entries.length === 0) return currentInput;
  if (browseIndex === -1) {
    browseScratch = currentInput;
    browseIndex = entries.length - 1;
    return entries[browseIndex]!;
  }
  if (browseIndex > 0) {
    browseIndex--;
    return entries[browseIndex]!;
  }
  return entries[0]!;
}

/**
 * ArrowDown: toward newer commands; at end restores scratch (often empty).
 */
export function historyNavigateDown(currentInput: string): string {
  if (browseIndex === -1) return currentInput;
  if (browseIndex < entries.length - 1) {
    browseIndex++;
    return entries[browseIndex]!;
  }
  browseIndex = -1;
  return browseScratch;
}

/** Handle ArrowUp/ArrowDown on the command input; returns true if consumed. */
export function handleHistoryKeydown(
  e: KeyboardEvent,
  currentInput: string,
  setInput: (value: string) => void,
): boolean {
  if (e.key === "ArrowUp") {
    e.preventDefault();
    setInput(historyNavigateUp(currentInput));
    return true;
  }
  if (e.key === "ArrowDown") {
    e.preventDefault();
    setInput(historyNavigateDown(currentInput));
    return true;
  }
  return false;
}

export type HistoryCommandResult =
  | { ok: true; kind: "list"; lines: string[] }
  | { ok: true; kind: "cleared" }
  | { ok: true; kind: "deleted"; lineNumber: number; removed: string }
  | { ok: false; error: string };

/** Do not append meta `history` mutations to the stored command list. */
export function shouldSkipHistoryRecord(commandLine: string): boolean {
  const t = commandLine.trim().toLowerCase();
  if (t === "history -c" || t === "history --clear") return true;
  if (/^history\s+-d\s+\d+$/.test(t)) return true;
  return false;
}

function formatHistoryListLines(slice: string[], startNum: number): string[] {
  const pad = String(entries.length).length;
  return slice.map((line, i) => {
    const num = String(startNum + i).padStart(pad, " ");
    return `  ${num}  ${line}`;
  });
}

function parseHistoryListLimit(args: string[]): number | "all" {
  if (args.length === 0) return "all";
  if (args[0] === "-n" && args[1]) {
    const n = Number.parseInt(args[1], 10);
    if (Number.isFinite(n) && n > 0) return Math.min(n, entries.length);
  }
  const n = Number.parseInt(args[0]!, 10);
  if (Number.isFinite(n) && n > 0) return Math.min(n, entries.length);
  return "all";
}

/**
 * Bash-style `history` subcommands:
 * - (none) / `20` / `-n 20` — list
 * - `-c` — clear all
 * - `-d <n>` — delete line *n* (same numbering as list / `!n`)
 */
export function executeHistoryCommand(args: string[]): HistoryCommandResult {
  if (args[0] === "-c" || args[0] === "--clear") {
    entries = [];
    persist();
    resetHistoryNavigation();
    return { ok: true, kind: "cleared" };
  }

  if (args[0] === "-d") {
    const raw = args[1]?.trim();
    if (!raw) {
      return { ok: false, error: "history: usage: history -d <n>" };
    }
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 1) {
      return { ok: false, error: "history: invalid line number" };
    }
    if (n > entries.length) {
      return { ok: false, error: `history: line ${n} not found` };
    }
    const removed = entries[n - 1]!;
    entries.splice(n - 1, 1);
    persist();
    resetHistoryNavigation();
    return { ok: true, kind: "deleted", lineNumber: n, removed };
  }

  const limit = parseHistoryListLimit(args);
  if (entries.length === 0) {
    return { ok: true, kind: "list", lines: [] };
  }
  const slice = limit === "all" ? entries : entries.slice(-limit);
  const startNum = entries.length - slice.length + 1;
  return {
    ok: true,
    kind: "list",
    lines: formatHistoryListLines(slice, startNum),
  };
}

export function getHistoryEntryCount(): number {
  return entries.length;
}

export type HistoryBangExpand =
  | { ok: true; expanded: string; event: string }
  | { ok: false; error: string };

/**
 * Bash-style event designators on a single line (no `!cmd:gs/...` modifiers).
 * - `!!` — previous command
 * - `!n` — history line *n* (matches `history` numbering, 1-based)
 * - `!-n` — *n* commands ago (`!-1` = last)
 * - `!prefix` — most recent command starting with `prefix`
 */
export function expandHistoryBang(line: string): HistoryBangExpand | null {
  const event = line.trim();
  if (!event.startsWith("!")) return null;

  if (entries.length === 0) {
    return { ok: false, error: "history: no previous commands" };
  }

  if (event === "!!") {
    return {
      ok: true,
      expanded: entries[entries.length - 1]!,
      event,
    };
  }

  const relative = /^!-(\d+)$/.exec(event);
  if (relative) {
    const n = Number.parseInt(relative[1]!, 10);
    if (!Number.isFinite(n) || n < 1) {
      return { ok: false, error: `history: invalid event ${event}` };
    }
    const idx = entries.length - n;
    if (idx < 0) {
      return { ok: false, error: `history: event not found: ${event}` };
    }
    return { ok: true, expanded: entries[idx]!, event };
  }

  const absolute = /^!(\d+)$/.exec(event);
  if (absolute) {
    const n = Number.parseInt(absolute[1]!, 10);
    if (!Number.isFinite(n) || n < 1 || n > entries.length) {
      return { ok: false, error: `history: event not found: ${event}` };
    }
    return { ok: true, expanded: entries[n - 1]!, event };
  }

  const prefix = event.slice(1);
  if (!prefix) {
    return { ok: false, error: `history: invalid event ${event}` };
  }

  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i]!;
    if (entry.startsWith(prefix)) {
      return { ok: true, expanded: entry, event };
    }
  }

  return { ok: false, error: `history: event not found: ${event}` };
}
