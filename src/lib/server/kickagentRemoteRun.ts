import { env } from "$env/dynamic/private";
import type { CommandOutcome } from "$lib/kickagent/contracts";
import type { DbTarget } from "$lib/server/dbTarget";
import type { RunKickagentCatalogOptions } from "$lib/server/kickagentCliRun";

/** Origin for kickagent HTTP API (manifest host or KICKAGENT_API_URL). */
export function resolveKickagentApiBaseUrl(): string | null {
  const explicit =
    env.KICKAGENT_API_URL?.trim() ?? process.env.KICKAGENT_API_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  const manifestUrl =
    env.PUBLIC_KICKAGENT_MANIFEST_URL?.trim() ??
    process.env.PUBLIC_KICKAGENT_MANIFEST_URL?.trim();
  if (!manifestUrl) return null;

  try {
    return new URL(manifestUrl).origin;
  } catch {
    return null;
  }
}

export async function runKickagentCatalogCommandViaApi(
  options: RunKickagentCatalogOptions & { db: DbTarget },
): Promise<CommandOutcome> {
  const base = resolveKickagentApiBaseUrl();
  if (!base) {
    throw new Error(
      "kickagent API URL not configured — set KICKAGENT_API_URL or PUBLIC_KICKAGENT_MANIFEST_URL",
    );
  }

  const token =
    env.KICKAGENT_SERVICE_TOKEN?.trim() ??
    process.env.KICKAGENT_SERVICE_TOKEN?.trim();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${base}/v1/commands/run`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      command: options.command,
      args: options.args,
      userId: options.userId,
      userEmail: options.userEmail,
      db: options.db,
    }),
  });

  const payload = (await res.json()) as {
    outcome?: CommandOutcome;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(payload.message ?? `kickagent API failed (${res.status})`);
  }

  return payload.outcome ?? {};
}
