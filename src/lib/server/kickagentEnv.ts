import { join } from "node:path";
import { env } from "$env/dynamic/private";
import type { DbTarget } from "$lib/server/dbTarget";
import { parseDotEnvFile } from "$lib/server/kickagentEnvParse";

export { parseDotEnvFile } from "$lib/server/kickagentEnvParse";

/**
 * Env for a kickagent CLI child process: SvelteKit private env + kickagent `.env`,
 * with explicit DB target aligned to publicweb's active target.
 */
export function buildKickagentSpawnEnv(
  repo: string,
  dbTarget: DbTarget,
): NodeJS.ProcessEnv {
  const out: NodeJS.ProcessEnv = { ...process.env };

  const databaseUrlDev = env.DATABASE_URL_DEV?.trim();
  const databaseUrl = env.DATABASE_URL?.trim();
  const publicwebDefault =
    env.PUBLICWEB_DB_DEFAULT?.trim() ??
    process.env.PUBLICWEB_DB_DEFAULT?.trim();

  if (databaseUrlDev && out.DATABASE_URL_DEV === undefined) {
    out.DATABASE_URL_DEV = databaseUrlDev;
  }
  if (databaseUrl && out.DATABASE_URL === undefined) {
    out.DATABASE_URL = databaseUrl;
  }

  for (const [key, value] of Object.entries(parseDotEnvFile(join(repo, ".env")))) {
    if (out[key] === undefined) out[key] = value;
  }

  out.KICKAGENT_DB_DEFAULT = dbTarget;
  if (publicwebDefault && dbTarget === "dev" && !out.PUBLICWEB_DB_DEFAULT) {
    out.PUBLICWEB_DB_DEFAULT = publicwebDefault;
  }

  return out;
}
