/**
 * Shared dev-console state.
 *
 * `klog(...)` is the proprietary logger that emits a "klog" entry into the
 * KAM Console pane. Use it from anywhere in the client codebase as a
 * dev-time alternative to console.log when you want the output visible in
 * the in-app console pane (toggled via the command palette: Ctrl+/  →  "console").
 *
 * Entries also persist to the server `klogs` table (per-user, 30-day retention)
 * via a debounced batch POST, and the pane hydrates from that table on mount.
 */

export type KlogLevel = "log" | "info" | "warn" | "error";

export type KlogEntry = {
  id: number;
  ts: number;
  level: KlogLevel;
  message: string;
  source: string | null;
};

import {
  getUiSettings,
  setConsoleOpen,
} from "../client/uiSettings.svelte";

const MAX_ENTRIES = 1000;
const FLUSH_DEBOUNCE_MS = 800;
const FLUSH_BATCH_CAP = 20;

let _paletteOpen = $state(false);
let _consoleOpen = $state(getUiSettings().consoleOpen);
let _entries = $state<KlogEntry[]>([]);
let _nextId = 1;
let _hydrated = false;

type PendingEntry = {
  ts: number;
  level: KlogLevel;
  message: string;
  source: string | null;
};

let pending: PendingEntry[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function schedulePersist(entry: PendingEntry): void {
  if (!isBrowser()) return;
  pending.push(entry);
  if (pending.length >= FLUSH_BATCH_CAP) {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    void flushPersist();
    return;
  }
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushPersist();
  }, FLUSH_DEBOUNCE_MS);
}

async function flushPersist(): Promise<void> {
  if (pending.length === 0) return;
  const batch = pending.splice(0, pending.length);
  try {
    await fetch("/api/klogs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ entries: batch }),
      credentials: "same-origin",
    });
  } catch {
    /* fire-and-forget: drop on network/auth failure */
  }
}

function formatArg(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Error)
    return value.stack ?? `${value.name}: ${value.message}`;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function push(
  level: KlogLevel,
  args: unknown[],
  opts?: { source?: string | null; ts?: number; persist?: boolean; id?: number },
): void {
  const message = args.map(formatArg).join(" ");
  const entry: KlogEntry = {
    id: opts?.id ?? _nextId++,
    ts: opts?.ts ?? Date.now(),
    level,
    message,
    source: opts?.source ?? null,
  };
  const next = [..._entries, entry];
  _entries = next.length > MAX_ENTRIES ? next.slice(-MAX_ENTRIES) : next;

  if (opts?.persist !== false) {
    schedulePersist({
      ts: entry.ts,
      level: entry.level,
      message: entry.message,
      source: entry.source,
    });
  }
}

export const devConsole = {
  get paletteOpen(): boolean {
    return _paletteOpen;
  },
  set paletteOpen(value: boolean) {
    _paletteOpen = value;
  },
  get consoleOpen(): boolean {
    return _consoleOpen;
  },
  set consoleOpen(value: boolean) {
    _consoleOpen = value;
    setConsoleOpen(value);
  },
  get entries(): readonly KlogEntry[] {
    return _entries;
  },
  togglePalette(): void {
    _paletteOpen = !_paletteOpen;
  },
  toggleConsole(): void {
    this.consoleOpen = !_consoleOpen;
  },
  clear(): void {
    _entries = [];
  },
};

export function klog(...args: unknown[]): void {
  push("log", args);
}

export function klogInfo(...args: unknown[]): void {
  push("info", args);
}

export function klogWarn(...args: unknown[]): void {
  push("warn", args);
}

export function klogError(...args: unknown[]): void {
  push("error", args);
}

/** Internal helper used by the command runner to tag source as `command:<name>`. */
export function klogWithSource(
  level: KlogLevel,
  source: string | null,
  ...args: unknown[]
): void {
  push(level, args, { source });
}

/**
 * Fetch the last N klogs for the current user and merge them into the pane
 * as non-persisting history entries. Call once per page load (from +layout).
 */
export async function hydrateFromServer(limit = 200): Promise<void> {
  if (!isBrowser() || _hydrated) return;
  _hydrated = true;
  try {
    const res = await fetch(`/api/klogs?limit=${limit}`, {
      credentials: "same-origin",
    });
    if (!res.ok) return;
    const payload = (await res.json()) as {
      entries?: Array<{
        id?: string;
        ts: number;
        level: KlogLevel;
        message: string;
        source: string | null;
      }>;
    };
    const remote = payload.entries ?? [];
    if (remote.length === 0) return;

    // Prepend remote entries as history; preserve any session-local entries that
    // may have been produced before hydration resolved.
    const sessionEntries = _entries;
    _entries = [];
    for (const e of remote) {
      push(e.level, [e.message], {
        ts: e.ts,
        source: e.source ?? null,
        persist: false,
      });
    }
    for (const e of sessionEntries) {
      push(e.level, [e.message], {
        ts: e.ts,
        source: e.source,
        persist: false,
        id: e.id,
      });
    }
  } catch {
    /* swallow */
  }
}
