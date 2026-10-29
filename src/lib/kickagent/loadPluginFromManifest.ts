import type {
  KickagentHostContext,
  KickagentRegistry,
  CommandHandler as KickagentCommandHandler,
} from "$lib/kickagent/contracts";
import { env } from "$env/dynamic/public";

import { createKlogBroadcaster } from "$lib/devConsole/state.svelte";
import {
  clearKickagentCommands,
  registerKickagentCommand,
  setLoadedSubscriberMeta,
  clearLoadedSubscriberMeta,
  listHostCommandNames,
} from "$lib/devConsole/commands";
import {
  MANIFEST_COMMAND_ROLES,
  setManifestCommandCache,
  type ManifestCommandRole,
} from "./manifestCommandCache";
import {
  listCachedResourceKeys,
  parseManifestResources,
  setManifestResourceCache,
  type ManifestResources,
} from "./manifestResourceCache";
import { getKickagentPluginSessionUser } from "./pluginSession";
import { registerManifestServerCommands } from "./registerManifestServerCommands";

type KickagentManifestCommandJson = {
  name: string;
  description: string;
  category: string;
  execution: "local" | "remote";
  sortOrder?: number;
  role?: ManifestCommandRole;
  sugarFor?: string;
};

type KickagentManifestJson = {
  version: string;
  moduleUrl: string;
  sha256: string;
  namespace: string;
  alias?: string;
  commands?: KickagentManifestCommandJson[];
  resources?: ManifestResources;
  api?: { baseUrl?: string };
};

export type LoadSubscriberResult =
  | {
      ok: true;
      id: string;
      version: string;
      namespace: string;
      alias?: string;
      commandCount: number;
      resourceKeys: string[];
      shaPrefix: string;
      /** True when url@sha matched and the module was not re-downloaded. */
      skipped: boolean;
      resourcesCached: boolean;
      aliasNote?: string;
    }
  | { ok: false; error: string };

/** @deprecated Prefer {@link loadSubscriber}; kept for call-site compatibility. */
export type ReloadKickagentResult =
  | { ok: true; version: string; resourcesCached: boolean }
  | { ok: false; error: string };

type AppliedRecord = {
  key: string;
  version: string;
  namespace: string;
  alias?: string;
  commandCount: number;
  resourceKeys: string[];
  shaPrefix: string;
};

/** Per subscriber id: `url@sha256` last successfully applied. */
const lastApplied = new Map<string, AppliedRecord>();

function assertFetchableUrl(urlStr: string, field: string): URL {
  let u: URL;
  try {
    u = new URL(urlStr);
  } catch {
    throw new Error(`${field}: invalid URL`);
  }
  if (u.protocol === "https:") return u;
  if (
    u.protocol === "http:" &&
    (u.hostname === "127.0.0.1" || u.hostname === "localhost")
  ) {
    return u;
  }
  throw new Error(
    `${field}: only https or http://127.0.0.1 / localhost allowed (got ${u.origin})`,
  );
}

async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", buffer);
  const bytes = new Uint8Array(hash);
  let hex = "";
  for (const b of bytes) {
    hex += b.toString(16).padStart(2, "0");
  }
  return hex;
}

function parseNamespace(raw: unknown): string {
  if (typeof raw !== "string" || !raw.trim()) return "kickagent";
  const t = raw.trim().toLowerCase();
  if (!/^[a-z][a-z0-9-]*$/.test(t)) {
    throw new Error(`manifest: invalid namespace "${raw}"`);
  }
  return t;
}

function parseAlias(raw: unknown): string | undefined {
  if (typeof raw !== "string" || !raw.trim()) return undefined;
  const t = raw.trim().toLowerCase();
  if (!/^[a-z][a-z0-9_-]*$/.test(t)) {
    throw new Error(`manifest: invalid alias "${raw}"`);
  }
  return t;
}

function parseManifest(raw: unknown): KickagentManifestJson {
  if (!raw || typeof raw !== "object") {
    throw new Error("manifest: expected JSON object");
  }
  const o = raw as Record<string, unknown>;
  const version = o.version;
  const moduleUrl = o.moduleUrl;
  const sha256 = o.sha256;
  if (typeof version !== "string" || !version.trim()) {
    throw new Error("manifest: missing version");
  }
  if (typeof moduleUrl !== "string" || !moduleUrl.trim()) {
    throw new Error("manifest: missing moduleUrl");
  }
  if (typeof sha256 !== "string" || !sha256.trim()) {
    throw new Error("manifest: missing sha256");
  }
  const commands = parseManifestCommands(o.commands);
  const resources = parseManifestResources(o.resources);

  return {
    version: version.trim(),
    moduleUrl: moduleUrl.trim(),
    sha256: sha256.trim().toLowerCase(),
    namespace: parseNamespace(o.namespace),
    alias: parseAlias(o.alias) ?? "ka",
    commands,
    resources: resources ?? undefined,
    api:
      o.api && typeof o.api === "object"
        ? (o.api as { baseUrl?: string })
        : undefined,
  };
}

function parseManifestCommands(raw: unknown): KickagentManifestCommandJson[] {
  if (!Array.isArray(raw)) return [];
  const out: KickagentManifestCommandJson[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const name = typeof row.name === "string" ? row.name.trim() : "";
    const description =
      typeof row.description === "string" ? row.description.trim() : "";
    const category = typeof row.category === "string" ? row.category.trim() : "";
    const execution = row.execution;
    if (!name || !category) continue;
    if (execution !== "local" && execution !== "remote") continue;
    const sortOrder =
      typeof row.sortOrder === "number" && Number.isFinite(row.sortOrder)
        ? row.sortOrder
        : undefined;
    const role = MANIFEST_COMMAND_ROLES.find((r) => r === row.role);
    const sugarFor =
      role === "shortcut" &&
      typeof row.sugarFor === "string" &&
      row.sugarFor.trim() !== ""
        ? row.sugarFor.trim()
        : undefined;
    out.push({
      name,
      description,
      category,
      execution,
      sortOrder,
      ...(role ? { role } : {}),
      ...(sugarFor ? { sugarFor } : {}),
    });
  }
  return out;
}

function resourceKeysFrom(resources: ManifestResources | null | undefined): string[] {
  if (!resources) return [];
  const keys = new Set<string>(Object.keys(resources.listDetail));
  if (resources.units) keys.add("units");
  return [...keys].sort();
}

function formatStatusLine(r: Extract<LoadSubscriberResult, { ok: true }>): string {
  const res =
    r.resourceKeys.length > 0
      ? `resources: ${r.resourceKeys.join(", ")}`
      : "resources: (none)";
  return `${r.namespace} v${r.version} · ${r.commandCount} commands · ${res}`;
}

export function formatLoadStatusLine(
  r: Extract<LoadSubscriberResult, { ok: true }>,
): string {
  if (r.skipped) {
    return `already current (v${r.version})`;
  }
  return formatStatusLine(r);
}

/** Resolve configured subscriber ids → manifest URLs (kickagent from public env today). */
export function listConfiguredSubscribers(): Array<{ id: string; manifestUrl: string }> {
  const url = env.PUBLIC_KICKAGENT_MANIFEST_URL?.trim() ?? "";
  if (!url) return [];
  return [{ id: "kickagent", manifestUrl: url }];
}

export function getSubscriberManifestUrl(id: string): string | null {
  const found = listConfiguredSubscribers().find((s) => s.id === id);
  return found?.manifestUrl ?? null;
}

export function getAppliedSubscriber(id: string): AppliedRecord | null {
  return lastApplied.get(id) ?? null;
}

export function unloadSubscriber(id: string): { ok: true } | { ok: false; error: string } {
  if (!lastApplied.has(id) && id !== "kickagent") {
    return { ok: false, error: `unload: unknown subscriber "${id}"` };
  }
  clearKickagentCommands();
  clearLoadedSubscriberMeta();
  lastApplied.delete(id);
  return { ok: true };
}

/**
 * Fetch subscriber manifest + module, verify sha256, dynamic import, register commands.
 * Skip key is `manifestUrl@sha256` (content hash), not version string.
 */
export async function loadSubscriber(
  id: string,
  options?: { force?: boolean },
): Promise<LoadSubscriberResult> {
  const force = options?.force === true;
  const manifestUrlRaw = getSubscriberManifestUrl(id);

  if (!manifestUrlRaw) {
    return {
      ok: false,
      error:
        id === "kickagent"
          ? "PUBLIC_KICKAGENT_MANIFEST_URL is not set — Phase 1 hello wiring still applies"
          : `no configured subscriber "${id}"`,
    };
  }

  assertFetchableUrl(manifestUrlRaw, "PUBLIC_KICKAGENT_MANIFEST_URL");

  try {
    const manifestRes = await fetch(manifestUrlRaw);
    if (!manifestRes.ok) {
      return {
        ok: false,
        error: `manifest fetch failed: ${manifestRes.status} ${manifestRes.statusText}`,
      };
    }
    const manifest = parseManifest(await manifestRes.json());
    const moduleUrlObj = assertFetchableUrl(
      manifest.moduleUrl,
      "manifest.moduleUrl",
    );

    const moduleUrlResolved = moduleUrlObj.toString();
    const applyKey = `${manifestUrlRaw}@${manifest.sha256}`;
    const resourceKeysPreview = resourceKeysFrom(manifest.resources ?? null);
    const commandCount = (manifest.commands ?? []).length;
    const shaPrefix = manifest.sha256.slice(0, 8);

    const hostVerbs = new Set(listHostCommandNames());
    if (hostVerbs.has(manifest.namespace)) {
      return {
        ok: false,
        error: `load ${id}: namespace "${manifest.namespace}" collides with a host verb`,
      };
    }

    const prev = lastApplied.get(id);
    if (!force && prev?.key === applyKey) {
      setManifestCommandCache(manifest.commands ?? []);
      setManifestResourceCache(manifest.resources ?? null);
      setLoadedSubscriberMeta({
        id,
        namespace: manifest.namespace,
        alias: manifest.alias,
      });
      return {
        ok: true,
        id,
        version: manifest.version,
        namespace: manifest.namespace,
        alias: manifest.alias,
        commandCount,
        resourceKeys: resourceKeysPreview.length
          ? resourceKeysPreview
          : listCachedResourceKeys(),
        shaPrefix,
        skipped: true,
        resourcesCached: resourceKeysPreview.length > 0,
      };
    }

    const modRes = await fetch(moduleUrlResolved);
    if (!modRes.ok) {
      return {
        ok: false,
        error: `module fetch failed: ${modRes.status} ${modRes.statusText}`,
      };
    }
    const moduleBytes = await modRes.arrayBuffer();
    const computed = (await sha256Hex(moduleBytes)).toLowerCase();
    if (computed !== manifest.sha256) {
      return {
        ok: false,
        error: `sha256 mismatch (manifest ${manifest.sha256.slice(0, 16)}… vs bytes ${computed.slice(0, 16)}…)`,
      };
    }

    const blob = new Blob([moduleBytes], {
      type: "application/javascript",
    });
    const blobUrl = URL.createObjectURL(blob);

    type PluginModule = {
      register?: (
        registry: KickagentRegistry,
        ctx: KickagentHostContext,
      ) => void;
    };

    let pluginMod: PluginModule;
    try {
      pluginMod = (await import(/* @vite-ignore */ blobUrl)) as PluginModule;
    } finally {
      URL.revokeObjectURL(blobUrl);
    }

    const pluginRegister = pluginMod.register;
    if (typeof pluginRegister !== "function") {
      return { ok: false, error: "plugin module has no register() export" };
    }

    const u = getKickagentPluginSessionUser();
    if (!u) {
      return { ok: false, error: "not signed in — cannot load kickagent plugin" };
    }

    const ns = manifest.namespace;
    const initCtx: KickagentHostContext = {
      userId: u.id,
      userEmail: u.email,
      logger: createKlogBroadcaster(`${ns}:plugin`),
      apiBaseUrl: manifest.api?.baseUrl,
    };

    const pending: Array<{ name: string; handler: KickagentCommandHandler }> =
      [];

    const collecting: KickagentRegistry = {
      register(name, handler) {
        pending.push({ name, handler });
      },
    };

    pluginRegister(collecting, initCtx);

    clearKickagentCommands();
    setManifestCommandCache(manifest.commands ?? []);
    setManifestResourceCache(manifest.resources ?? null);
    setLoadedSubscriberMeta({
      id,
      namespace: ns,
      alias: manifest.alias,
    });

    const pluginNames = new Set<string>();

    for (const { name, handler } of pending) {
      pluginNames.add(name);
      registerKickagentCommand(name, async (args) => {
        const u0 = getKickagentPluginSessionUser();
        if (!u0) {
          throw new Error("not signed in");
        }
        const handlerCtx: KickagentHostContext = {
          userId: u0.id,
          userEmail: u0.email,
          logger: createKlogBroadcaster(`${ns}:${name}`),
          apiBaseUrl: manifest.api?.baseUrl,
        };
        return handler(args, handlerCtx);
      });
    }

    registerManifestServerCommands(manifest.commands ?? [], pluginNames);

    const resourceKeys = listCachedResourceKeys();
    lastApplied.set(id, {
      key: applyKey,
      version: manifest.version,
      namespace: ns,
      alias: manifest.alias,
      commandCount,
      resourceKeys,
      shaPrefix,
    });

    let aliasNote: string | undefined;
    if (manifest.alias) {
      const { getCommandAliases, setCommandAlias } = await import(
        "$lib/client/consoleUi.svelte"
      );
      const existing = getCommandAliases()[manifest.alias];
      if (existing && existing !== ns) {
        aliasNote = `alias ${manifest.alias} already → ${existing} (kept host alias)`;
      } else if (!existing) {
        try {
          setCommandAlias(manifest.alias, ns);
          aliasNote = `alias ${manifest.alias} → ${ns}`;
        } catch {
          /* shortcut may collide with a host verb — ignore suggested alias */
        }
      }
    }

    return {
      ok: true,
      id,
      version: manifest.version,
      namespace: ns,
      alias: manifest.alias,
      commandCount,
      resourceKeys,
      shaPrefix,
      skipped: false,
      resourcesCached: resourceKeys.length > 0,
      aliasNote,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `kickagent load failed: ${msg}` };
  }
}

export async function loadAllSubscribers(options?: {
  force?: boolean;
}): Promise<LoadSubscriberResult[]> {
  const ids = listConfiguredSubscribers().map((s) => s.id);
  if (ids.length === 0) {
    return [
      {
        ok: false,
        error:
          "PUBLIC_KICKAGENT_MANIFEST_URL is not set — Phase 1 hello wiring still applies",
      },
    ];
  }
  const out: LoadSubscriberResult[] = [];
  for (const id of ids) {
    out.push(await loadSubscriber(id, options));
  }
  return out;
}

/**
 * Fetch kickagent manifest + module, verify sha256, dynamic import, register commands.
 * @deprecated Prefer {@link loadSubscriber}(`"kickagent"`, …).
 */
export async function reloadKickagentPluginFromManifest(options?: {
  force?: boolean;
}): Promise<ReloadKickagentResult> {
  const r = await loadSubscriber("kickagent", options);
  if (!r.ok) return r;
  return {
    ok: true,
    version: r.version,
    resourcesCached: r.resourcesCached,
  };
}
