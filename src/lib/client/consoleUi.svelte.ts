/**
 * KAM-console UI preferences stored separately from broader UI settings.
 * Command aliases rewrite the leading token (+ inject words) before resolution.
 */

export const CONSOLE_UI_STORAGE_KEY = "publicweb.consoleUi";
export const CONSOLE_UI_VERSION = 1;

const MAX_ALIASES = 48;
const MAX_ALIAS_EXPANSION_LEN = 200;

export type ConsoleUiPrefs = {
  version: number;
  /** Shortcut (lowercase) → expansion text (≥1 whitespace-separated tokens). */
  commandAliases: Record<string, string>;
};

export const DEFAULT_CONSOLE_UI_PREFS: ConsoleUiPrefs = {
  version: CONSOLE_UI_VERSION,
  commandAliases: {},
};

let cache: ConsoleUiPrefs | null = null;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function cloneDefaults(): ConsoleUiPrefs {
  return {
    ...DEFAULT_CONSOLE_UI_PREFS,
    commandAliases: { ...DEFAULT_CONSOLE_UI_PREFS.commandAliases },
  };
}

function persist(prefs: ConsoleUiPrefs): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(CONSOLE_UI_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* no-op */
  }
}

function isValidPrefs(value: unknown): value is ConsoleUiPrefs {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  if (typeof o.version !== "number") return false;
  if (!o.commandAliases || typeof o.commandAliases !== "object") return false;
  const aliases = o.commandAliases as Record<string, unknown>;
  for (const [k, v] of Object.entries(aliases)) {
    if (typeof k !== "string" || typeof v !== "string") return false;
  }
  return true;
}

/** Reserved alias keys (prevent hijacking meta commands). */
const RESERVED_KEYS = new Set(["alias", "unalias"]);

export function normalizeAliasShortcut(key: string): string | null {
  const t = key.trim().toLowerCase();
  if (!t || RESERVED_KEYS.has(t)) return null;
  if (t.includes(":") || /\s/.test(t)) return null;
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(t)) return null;
  return t;
}

export function normalizeAliasExpansion(value: string): string | null {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed || trimmed.length > MAX_ALIAS_EXPANSION_LEN) return null;
  const parts = trimmed.split(" ");
  for (const p of parts) {
    const lower = p.toLowerCase();
    if (
      !/^[a-z0-9][a-z0-9_-]*(:[a-z0-9][a-z0-9_-]*)?$/.test(lower)
    ) {
      return null;
    }
  }
  return trimmed;
}

export function getConsoleUiPrefs(): ConsoleUiPrefs {
  if (cache) return cache;
  if (!isBrowser()) {
    cache = cloneDefaults();
    return cache;
  }
  try {
    const raw = window.localStorage.getItem(CONSOLE_UI_STORAGE_KEY);
    if (!raw) {
      cache = cloneDefaults();
      return cache;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (
      !isValidPrefs(parsed) ||
      parsed.version !== CONSOLE_UI_VERSION
    ) {
      cache = cloneDefaults();
      return cache;
    }
    cache = {
      ...parsed,
      commandAliases: { ...parsed.commandAliases },
    };
    return cache;
  } catch {
    cache = cloneDefaults();
    return cache;
  }
}

export function getCommandAliases(): Readonly<Record<string, string>> {
  return getConsoleUiPrefs().commandAliases;
}

export function listCommandAliases(): Array<{ shortcut: string; expansion: string }> {
  const a = getCommandAliases();
  return Object.entries(a).map(([shortcut, expansion]) => ({ shortcut, expansion }));
}

export function setCommandAlias(shortcutRaw: string, expansionRaw: string): ConsoleUiPrefs {
  const key = normalizeAliasShortcut(shortcutRaw);
  const expansion = normalizeAliasExpansion(expansionRaw);
  if (!key || !expansion) {
    throw new Error(
      "alias: invalid shortcut or expansion (alphanumeric tokens; optional single : in a token)",
    );
  }
  if (ReservedTargets.has(expansion.split(" ")[0]!.toLowerCase())) {
    throw new Error("alias: expansion may not begin with alias or unalias");
  }

  const base = getConsoleUiPrefs();
  const nextAliases = { ...base.commandAliases, [key]: expansion };
  if (Object.keys(nextAliases).length > MAX_ALIASES) {
    throw new Error(`alias: at most ${MAX_ALIASES} aliases`);
  }

  const next: ConsoleUiPrefs = {
    ...base,
    version: CONSOLE_UI_VERSION,
    commandAliases: nextAliases,
  };
  cache = next;
  persist(next);
  return next;
}

const ReservedTargets = new Set(["alias", "unalias"]);

/** Drop every saved alias; keeps version and future non-alias prefs. */
export function clearCommandAliases(): ConsoleUiPrefs {
  const base = getConsoleUiPrefs();
  const next: ConsoleUiPrefs = {
    ...base,
    version: CONSOLE_UI_VERSION,
    commandAliases: {},
  };
  cache = next;
  persist(next);
  return next;
}

export function removeCommandAlias(shortcutRaw: string): ConsoleUiPrefs {
  const key = normalizeAliasShortcut(shortcutRaw);
  if (!key) {
    throw new Error("unalias: invalid shortcut");
  }
  const base = getConsoleUiPrefs();
  const nextAliases = { ...base.commandAliases };
  if (!(key in nextAliases)) {
    throw new Error(`unalias: no alias named ${shortcutRaw}`);
  }
  delete nextAliases[key];
  const next: ConsoleUiPrefs = {
    ...base,
    version: CONSOLE_UI_VERSION,
    commandAliases: nextAliases,
  };
  cache = next;
  persist(next);
  return next;
}

export function resetConsoleUiPrefs(): ConsoleUiPrefs {
  const next = cloneDefaults();
  cache = next;
  persist(next);
  return next;
}
