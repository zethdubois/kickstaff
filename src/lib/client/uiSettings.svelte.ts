import {
  isEmptyListPrefs,
  normalizeListPrefs,
  type ListPrefs,
} from "$lib/kickagent/listPrefs";

export const UI_SETTINGS_STORAGE_KEY = "kickstaff.uiSettings";
/** v6: `activeNamespace` replaces `kamMode` (`default` | `kickagent`). */
export const UI_SETTINGS_VERSION = 6;

export type UISettings = {
  version: number;
  consoleOpen: boolean;
  /**
   * Active subscriber palette namespace, or `""` for host verbs.
   * Bare names resolve under `<namespace>:` when set.
   */
  activeNamespace: string;
  /** List sort / quick filters / include-flags, keyed by manifest resource name (e.g. `gl`). */
  listPrefs: Record<string, ListPrefs>;
};

export const DEFAULT_UI_SETTINGS: UISettings = {
  version: UI_SETTINGS_VERSION,
  consoleOpen: false,
  activeNamespace: "",
  listPrefs: {},
};

let cache: UISettings | null = null;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function cloneDefaults(): UISettings {
  return { ...DEFAULT_UI_SETTINGS, listPrefs: {} };
}

function normalizeNamespace(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const t = raw.trim().toLowerCase();
  if (!t || t === "default") return "";
  if (!/^[a-z][a-z0-9-]*$/.test(t)) return "";
  return t;
}

function normalizeAllListPrefs(raw: unknown): Record<string, ListPrefs> {
  const out: Record<string, ListPrefs> = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  for (const [name, value] of Object.entries(raw)) {
    const prefs = normalizeListPrefs(value);
    if (!isEmptyListPrefs(prefs)) out[name] = prefs;
  }
  return out;
}

/** Current version as-is; v4/v5 upgraded in place; anything else → null. */
function readStored(value: unknown): UISettings | null {
  if (!value || typeof value !== "object") return null;
  const o = value as Record<string, unknown>;
  if (typeof o.version !== "number" || typeof o.consoleOpen !== "boolean") {
    return null;
  }
  if (o.version !== UI_SETTINGS_VERSION && o.version !== 5 && o.version !== 4) {
    return null;
  }

  let activeNamespace = "";
  if ("activeNamespace" in o) {
    activeNamespace = normalizeNamespace(o.activeNamespace);
  } else if (typeof o.kamMode === "string" && o.kamMode === "kickagent") {
    activeNamespace = "kickagent";
  }

  return {
    version: UI_SETTINGS_VERSION,
    consoleOpen: o.consoleOpen as boolean,
    activeNamespace,
    listPrefs: normalizeAllListPrefs(o.listPrefs),
  };
}

function persist(settings: UISettings): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(UI_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* no-op */
  }
}

export function resetUiSettings(): UISettings {
  const next = cloneDefaults();
  cache = next;
  persist(next);
  return next;
}

export function getUiSettings(): UISettings {
  if (cache) return cache;
  if (!isBrowser()) {
    cache = cloneDefaults();
    return cache;
  }

  try {
    const raw = window.localStorage.getItem(UI_SETTINGS_STORAGE_KEY);
    if (!raw) {
      return resetUiSettings();
    }

    const stored = readStored(JSON.parse(raw) as unknown);
    if (!stored) {
      return resetUiSettings();
    }

    cache = stored;
    persist(stored);
    return cache;
  } catch {
    return resetUiSettings();
  }
}

export function setConsoleOpen(consoleOpen: boolean): UISettings {
  const next: UISettings = {
    ...getUiSettings(),
    version: UI_SETTINGS_VERSION,
    consoleOpen,
  };
  cache = next;
  persist(next);
  return next;
}

export function setActiveNamespace(activeNamespace: string): UISettings {
  const next: UISettings = {
    ...getUiSettings(),
    version: UI_SETTINGS_VERSION,
    activeNamespace: normalizeNamespace(activeNamespace),
  };
  cache = next;
  persist(next);
  return next;
}

/** Saved list prefs for one resource (defaults when none). */
export function getListPrefs(resource: string): ListPrefs {
  return normalizeListPrefs(getUiSettings().listPrefs[resource]);
}

/** Save list prefs; an all-default value removes the entry. */
export function saveListPrefs(resource: string, prefs: ListPrefs): UISettings {
  const current = getUiSettings();
  const listPrefs = { ...current.listPrefs };
  const normalized = normalizeListPrefs(prefs);
  if (isEmptyListPrefs(normalized)) delete listPrefs[resource];
  else listPrefs[resource] = normalized;
  const next: UISettings = { ...current, version: UI_SETTINGS_VERSION, listPrefs };
  cache = next;
  persist(next);
  return next;
}

export function clearListPrefs(resource: string): UISettings {
  const current = getUiSettings();
  if (!(resource in current.listPrefs)) return current;
  const listPrefs = { ...current.listPrefs };
  delete listPrefs[resource];
  const next: UISettings = { ...current, version: UI_SETTINGS_VERSION, listPrefs };
  cache = next;
  persist(next);
  return next;
}
