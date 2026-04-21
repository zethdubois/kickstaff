export const UI_SETTINGS_STORAGE_KEY = "publicweb.uiSettings";
export const UI_SETTINGS_VERSION = 1;

export type UISettings = {
  version: number;
  consoleOpen: boolean;
};

export const DEFAULT_UI_SETTINGS: UISettings = {
  version: UI_SETTINGS_VERSION,
  consoleOpen: false,
};

let cache: UISettings | null = null;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function cloneDefaults(): UISettings {
  return { ...DEFAULT_UI_SETTINGS };
}

function isValidShape(value: unknown): value is UISettings {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  return typeof o.version === "number" && typeof o.consoleOpen === "boolean";
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

    const parsed = JSON.parse(raw) as unknown;
    if (!isValidShape(parsed) || parsed.version !== UI_SETTINGS_VERSION) {
      return resetUiSettings();
    }

    cache = parsed;
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
