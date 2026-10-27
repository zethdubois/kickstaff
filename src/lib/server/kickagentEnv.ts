import { join } from "node:path";
import { env } from "$env/dynamic/private";
import type { DbTarget } from "$lib/server/dbTarget";
import {
  resolveConnectionStringFromEnv,
  toKickagentDbTarget,
  type DbTargetEnv,
} from "$lib/server/dbTargetCore";
import { parseDotEnvFile } from "$lib/server/kickagentEnvParse";

export { parseDotEnvFile } from "$lib/server/kickagentEnvParse";

/**
 * Env for a kickagent CLI child process: SvelteKit private env + kickagent `.env`,
 * with explicit DB target aligned to kickstaff's active target.
 *
 * Kickagent only knows `dev` | `prod`. Staging maps to `--db prod` with
 * `DATABASE_URL` set to the staging connection string for that child.
 */
export function buildKickagentSpawnEnv(
  repo: string,
  dbTarget: DbTarget,
): NodeJS.ProcessEnv {
  const out: NodeJS.ProcessEnv = { ...process.env };

  const databaseUrlDev = env.DATABASE_URL_DEV?.trim();
  const databaseUrlStaging =
    env.DATABASE_URL_STAGING?.trim() ?? process.env.DATABASE_URL_STAGING?.trim();
  const databaseUrl = env.DATABASE_URL?.trim();

  if (databaseUrlDev && out.DATABASE_URL_DEV === undefined) {
    out.DATABASE_URL_DEV = databaseUrlDev;
  }
  if (databaseUrlStaging && out.DATABASE_URL_STAGING === undefined) {
    out.DATABASE_URL_STAGING = databaseUrlStaging;
  }
  if (databaseUrl && out.DATABASE_URL === undefined) {
    out.DATABASE_URL = databaseUrl;
  }

  for (const [key, value] of Object.entries(parseDotEnvFile(join(repo, ".env")))) {
    if (out[key] === undefined) out[key] = value;
  }

  const kickagentTarget = toKickagentDbTarget(dbTarget);
  out.KICKAGENT_DB_DEFAULT = kickagentTarget;

  if (dbTarget === "staging") {
    const dbEnv: DbTargetEnv = {
      nodeEnv: process.env.NODE_ENV,
      railwayEnvironment:
        process.env.RAILWAY_ENVIRONMENT_NAME?.trim() ||
        process.env.RAILWAY_ENVIRONMENT?.trim() ||
        undefined,
      databaseUrlDev,
      databaseUrlStaging,
      databaseUrl,
    };
    out.DATABASE_URL = resolveConnectionStringFromEnv(dbEnv, "staging");
  }

  return out;
}
