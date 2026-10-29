import { join } from "node:path";
import { env } from "$env/dynamic/private";
import type { DbTarget } from "$lib/server/dbTarget";
import {
  resolveConnectionStringFromEnv,
  toKickagentDbTarget,
  type DbTargetEnv,
} from "$lib/server/dbTargetCore";
import { parseDotEnvFile } from "$lib/server/kickagentEnvParse";
import { opsConnectionString } from "$lib/server/opsConnectionString";

export { parseDotEnvFile } from "$lib/server/kickagentEnvParse";
export { opsConnectionString } from "$lib/server/opsConnectionString";

/**
 * Env for a kickagent CLI child process: SvelteKit private env + kickagent `.env`,
 * with explicit DB target aligned to kickstaff's active target.
 *
 * Kickagent only knows `dev` | `prod`. Staging maps to `--db prod`.
 * Database URLs given to the child are the **ops** database on that instance
 * (path suffix), never the product database.
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

  // Product URLs stay on this process. The child only receives the ops database
  // on the same instance (different path). A kickagent `.env` must not put the
  // product URL back.
  if (databaseUrlDev) out.DATABASE_URL_DEV = opsConnectionString(databaseUrlDev);
  if (databaseUrl) out.DATABASE_URL = opsConnectionString(databaseUrl);

  for (const [key, value] of Object.entries(parseDotEnvFile(join(repo, ".env")))) {
    if (key === "DATABASE_URL" || key === "DATABASE_URL_DEV" || key === "DATABASE_URL_STAGING") {
      continue;
    }
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
    out.DATABASE_URL = opsConnectionString(resolveConnectionStringFromEnv(dbEnv, "staging"));
  }

  return out;
}
