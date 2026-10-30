/**
 * Idempotent seed of ops_datasets from product DATABASE_URL* path rewrite.
 *
 * Usage:
 *   pnpm seed:ops-datasets
 *   pnpm seed:ops-datasets --db staging
 *
 * Requires product DATABASE_URL_* for the target. Never copies the product URL
 * into an ops row — only the rewritten ops path.
 */
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import pg from "pg";
import * as schema from "../src/lib/server/schema.ts";
import { opsConnectionString } from "../src/lib/server/opsConnectionString.ts";
import {
  getCliDbDisplayInfo,
  resolveCliConnectionString,
  resolveCliDbTarget,
  warnIfExplicitProdCliTarget,
} from "./lib/dbCli.ts";

const { opsDatasets } = schema;

type SeedCandidate = { name: string; label: string; productUrl: string };

function candidatesForCliTarget(
  target: "dev" | "staging" | "prod",
): SeedCandidate[] {
  const out: SeedCandidate[] = [];
  const dev = process.env.DATABASE_URL_DEV?.trim();
  const staging = process.env.DATABASE_URL_STAGING?.trim();
  const prod = process.env.DATABASE_URL?.trim();

  if (target === "dev" && dev) {
    out.push({ name: "dev", label: "Development", productUrl: dev });
  }
  if (target === "staging") {
    const url = staging || prod;
    if (url) out.push({ name: "staging", label: "Staging", productUrl: url });
  }
  if (target === "prod" && prod) {
    out.push({ name: "prod", label: "Production", productUrl: prod });
  }
  // When seeding the product DB that matches the CLI target, also seed sibling
  // rows if their product URLs are configured (laptop may have all three).
  if (target === "dev") {
    if (staging) out.push({ name: "staging", label: "Staging", productUrl: staging });
    if (prod) out.push({ name: "prod", label: "Production", productUrl: prod });
  }
  const seen = new Set<string>();
  return out.filter((c) => {
    if (seen.has(c.name)) return false;
    seen.add(c.name);
    return true;
  });
}

async function main() {
  const target = resolveCliDbTarget(process.argv.slice(2));
  warnIfExplicitProdCliTarget(target);
  const info = getCliDbDisplayInfo(target);
  const connectionString = resolveCliConnectionString(target);
  console.info(`product target: ${info.label} (${info.host}/${info.database})`);

  const pool = new pg.Pool({ connectionString });
  const db = drizzle(pool, { schema });

  try {
    const list = candidatesForCliTarget(target);
    if (list.length === 0) {
      console.error("No product DATABASE_URL* configured for seed candidates.");
      process.exitCode = 1;
      return;
    }

    let inserted = 0;
    for (const c of list) {
      const existing = await db
        .select({ id: opsDatasets.id })
        .from(opsDatasets)
        .where(eq(opsDatasets.name, c.name))
        .limit(1);
      if (existing.length > 0) {
        console.info(`skip ${c.name} (already present)`);
        continue;
      }
      const opsUrl = opsConnectionString(c.productUrl);
      await db.insert(opsDatasets).values({
        name: c.name,
        label: c.label,
        connectionString: opsUrl,
        enabled: true,
      });
      console.info(`inserted ${c.name} → ops path ${new URL(opsUrl).pathname}`);
      inserted += 1;
    }
    console.info(`done — inserted ${inserted}`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
