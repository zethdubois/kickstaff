/**
 * Ops datasets: rows in the product database that hold Kickagent connection strings.
 * Contract: ../kickagent/docs/kickagent/architecture/host-ops-database.md
 *
 * Seed once from the product URL path rewrite. After that, form/SQL rows win.
 * Never send `connectionString` to the browser.
 */

import { and, eq } from "drizzle-orm";
import { env } from "$env/dynamic/private";
import { getDb } from "$lib/server/db";
import {
  getActiveDbTarget,
  resolveConnectionString,
  type DbTarget,
} from "$lib/server/dbTarget";
import { opsConnectionString } from "$lib/server/opsConnectionString";
import {
  opsDatasetGrants,
  opsDatasets,
  type User,
  type UserRole,
} from "$lib/server/schema";

export type OpsDatabasePayload = {
  name: string;
  connectionString: string;
};

export type OpsDatasetPublic = {
  id: string;
  name: string;
  label: string;
  enabled: boolean;
  /** True when a connection string is stored (never the value itself). */
  hasConnectionString: boolean;
  updatedAt: Date;
};

const NAME_PATTERN = /^[a-z][a-z0-9-]*$/;

export function isValidDatasetName(name: string): boolean {
  return NAME_PATTERN.test(name);
}

function labelForTarget(target: DbTarget): string {
  if (target === "dev") return "Development";
  if (target === "staging") return "Staging";
  return "Production";
}

/** Product URLs available on this process for first-run seed. */
export function productUrlsForSeed(): Array<{ name: DbTarget; productUrl: string }> {
  const out: Array<{ name: DbTarget; productUrl: string }> = [];
  const dev = env.DATABASE_URL_DEV?.trim();
  if (dev) out.push({ name: "dev", productUrl: dev });
  const staging =
    env.DATABASE_URL_STAGING?.trim() ?? process.env.DATABASE_URL_STAGING?.trim();
  if (staging) out.push({ name: "staging", productUrl: staging });
  const prod = env.DATABASE_URL?.trim();
  // On Railway staging/prod, DATABASE_URL is this service's product DB — seed that tier.
  // On a laptop with only DATABASE_URL_DEV, skip empty DATABASE_URL.
  if (prod) {
    const railway =
      process.env.RAILWAY_ENVIRONMENT_NAME?.trim() ||
      process.env.RAILWAY_ENVIRONMENT?.trim() ||
      "";
    if (/stag/i.test(railway)) {
      out.push({ name: "staging", productUrl: prod });
    } else if (process.env.NODE_ENV === "production" || railway) {
      out.push({ name: "prod", productUrl: prod });
    } else {
      // Laptop optional DATABASE_URL → prod row
      out.push({ name: "prod", productUrl: prod });
    }
  }
  // Dedupe by name (Railway staging may also have DATABASE_URL_STAGING unset)
  const seen = new Set<string>();
  return out.filter((row) => {
    if (seen.has(row.name)) return false;
    seen.add(row.name);
    return true;
  });
}

/**
 * Insert missing rows from product URL path rewrite. Existing rows are left alone.
 * Returns how many rows were inserted.
 */
export async function seedOpsDatasetsFromEnv(): Promise<{ inserted: number; names: string[] }> {
  const db = getDb();
  const candidates = productUrlsForSeed();
  const inserted: string[] = [];

  for (const { name, productUrl } of candidates) {
    const existing = await db
      .select({ id: opsDatasets.id })
      .from(opsDatasets)
      .where(eq(opsDatasets.name, name))
      .limit(1);
    if (existing.length > 0) continue;

    const connectionString = opsConnectionString(productUrl);
    await db.insert(opsDatasets).values({
      name,
      label: labelForTarget(name),
      connectionString,
      enabled: true,
    });
    inserted.push(name);
  }

  return { inserted: inserted.length, names: inserted };
}

export async function listOpsDatasetsPublic(): Promise<OpsDatasetPublic[]> {
  const db = getDb();
  const rows = await db.select().from(opsDatasets).orderBy(opsDatasets.name);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    label: r.label,
    enabled: r.enabled,
    hasConnectionString: Boolean(r.connectionString?.trim()),
    updatedAt: r.updatedAt,
  }));
}

export async function getOpsDatasetByName(name: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(opsDatasets)
    .where(eq(opsDatasets.name, name))
    .limit(1);
  return rows[0] ?? null;
}

export async function userHasDatasetGrant(
  userId: string,
  datasetName: string,
): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .select({ userId: opsDatasetGrants.userId })
    .from(opsDatasetGrants)
    .where(
      and(
        eq(opsDatasetGrants.userId, userId),
        eq(opsDatasetGrants.datasetName, datasetName),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

/**
 * Whether this user may use the named dataset on this deployment.
 * Admin: any enabled row. Others: grant required.
 */
export async function canUserUseDataset(
  user: Pick<User, "id" | "role"> | { id: string; role: UserRole },
  datasetName: string,
  enabled: boolean,
): Promise<boolean> {
  if (!enabled) return false;
  if (user.role === "admin") return true;
  return userHasDatasetGrant(user.id, datasetName);
}

/**
 * Resolve opsDatabase for a kickagent data command.
 * Maps the active product target name → dataset row; falls back to path rewrite
 * when no row exists yet (until seed/form).
 */
export async function resolveOpsDatabase(options: {
  user: Pick<User, "id" | "role">;
  /** Defaults to active product target (`db use` / cookie). */
  datasetName?: string;
}): Promise<OpsDatabasePayload> {
  const name = (options.datasetName ?? getActiveDbTarget()).trim().toLowerCase();
  if (!isValidDatasetName(name)) {
    throw new Error(`invalid ops dataset name: ${name}`);
  }

  const row = await getOpsDatasetByName(name);
  if (row) {
    const allowed = await canUserUseDataset(options.user, row.name, row.enabled);
    if (!allowed) {
      throw new Error(
        row.enabled
          ? `no grant for ops dataset "${row.name}"`
          : `ops dataset "${row.name}" is disabled`,
      );
    }
    if (!row.connectionString.trim()) {
      throw new Error(`ops dataset "${row.name}" has no connection string`);
    }
    return { name: row.name, connectionString: row.connectionString };
  }

  // Fallback: rewrite product URL path until seed/form creates the row.
  if (options.user.role !== "admin") {
    throw new Error(
      `ops dataset "${name}" is not configured — ask an admin to seed datasets`,
    );
  }
  const productUrl = resolveConnectionString(
    (name === "dev" || name === "staging" || name === "prod"
      ? name
      : getActiveDbTarget()) as DbTarget,
  );
  return {
    name,
    connectionString: opsConnectionString(productUrl),
  };
}

export async function upsertOpsDataset(input: {
  name: string;
  label: string;
  connectionString?: string;
  enabled: boolean;
  /** When updating, omit connectionString to leave the secret unchanged. */
  id?: string;
}): Promise<OpsDatasetPublic> {
  const name = input.name.trim().toLowerCase();
  if (!isValidDatasetName(name)) {
    throw new Error(
      "name must be lowercase letters, digits, hyphens (start with a letter)",
    );
  }
  const label = input.label.trim();
  if (!label) throw new Error("label is required");

  const db = getDb();
  const now = new Date();

  if (input.id) {
    const existing = await db
      .select()
      .from(opsDatasets)
      .where(eq(opsDatasets.id, input.id))
      .limit(1);
    const row = existing[0];
    if (!row) throw new Error("dataset not found");

    const connectionString =
      input.connectionString !== undefined && input.connectionString.trim() !== ""
        ? input.connectionString.trim()
        : row.connectionString;

    await db
      .update(opsDatasets)
      .set({
        name,
        label,
        connectionString,
        enabled: input.enabled,
        updatedAt: now,
      })
      .where(eq(opsDatasets.id, input.id));

    return {
      id: input.id,
      name,
      label,
      enabled: input.enabled,
      hasConnectionString: Boolean(connectionString.trim()),
      updatedAt: now,
    };
  }

  const connectionString = input.connectionString?.trim() ?? "";
  if (!connectionString) {
    throw new Error("connectionString is required for a new dataset");
  }

  const inserted = await db
    .insert(opsDatasets)
    .values({
      name,
      label,
      connectionString,
      enabled: input.enabled,
    })
    .returning({ id: opsDatasets.id, updatedAt: opsDatasets.updatedAt });

  return {
    id: inserted[0]!.id,
    name,
    label,
    enabled: input.enabled,
    hasConnectionString: true,
    updatedAt: inserted[0]!.updatedAt,
  };
}
