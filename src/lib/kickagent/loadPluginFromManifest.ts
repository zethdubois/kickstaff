import type {
  KickagentHostContext,
  KickagentRegistry,
  CommandHandler as KickagentCommandHandler,
} from "kickagent";

import { createKlogBroadcaster } from "$lib/devConsole/state.svelte";
import {
  clearKickagentCommands,
  registerKickagentCommand,
} from "$lib/devConsole/commands";
import { getKickagentPluginSessionUser } from "./pluginSession";

type KickagentManifestJson = {
  version: string;
  moduleUrl: string;
  sha256: string;
  api?: { baseUrl?: string };
};

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
  return {
    version: version.trim(),
    moduleUrl: moduleUrl.trim(),
    sha256: sha256.trim().toLowerCase(),
    api:
      o.api && typeof o.api === "object"
        ? (o.api as { baseUrl?: string })
        : undefined,
  };
}

export type ReloadKickagentResult =
  | { ok: true; version: string }
  | { ok: false; error: string };

/**
 * Fetch kickagent manifest + module, verify sha256, dynamic import, register commands.
 * When `force` is false and the same manifest URL + version was already applied this session, skips work.
 */
let lastAppliedKey: string | null = null;

export async function reloadKickagentPluginFromManifest(options?: {
  force?: boolean;
}): Promise<ReloadKickagentResult> {
  const force = options?.force === true;
  const manifestUrlRaw =
    import.meta.env.PUBLIC_KICKAGENT_MANIFEST_URL?.trim() ?? "";

  if (!manifestUrlRaw) {
    return {
      ok: false,
      error:
        "PUBLIC_KICKAGENT_MANIFEST_URL is not set — Phase 1 hello wiring still applies",
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

    const applyKey = `${manifestUrlRaw}@${manifest.version}`;
    if (!force && lastAppliedKey === applyKey) {
      return { ok: true, version: manifest.version };
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

    const initCtx: KickagentHostContext = {
      userId: u.id,
      userEmail: u.email,
      logger: createKlogBroadcaster("kickagent:plugin"),
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

    for (const { name, handler } of pending) {
      registerKickagentCommand(name, async (args) => {
        const u0 = getKickagentPluginSessionUser();
        if (!u0) {
          throw new Error("not signed in");
        }
        const handlerCtx: KickagentHostContext = {
          userId: u0.id,
          userEmail: u0.email,
          logger: createKlogBroadcaster(`kickagent:${name}`),
          apiBaseUrl: manifest.api?.baseUrl,
        };
        return handler(args, handlerCtx);
      });
    }

    lastAppliedKey = applyKey;
    return { ok: true, version: manifest.version };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `kickagent load failed: ${msg}` };
  }
}
