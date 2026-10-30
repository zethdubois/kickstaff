import type { Actions, PageServerLoad } from "./$types";
import { fail } from "@sveltejs/kit";
import { requireAdmin } from "$lib/server/guards";
import {
  isValidDatasetName,
  listOpsDatasetsPublic,
  seedOpsDatasetsFromEnv,
  upsertOpsDataset,
} from "$lib/server/opsDatasets";

export const load: PageServerLoad = async ({ locals }) => {
  requireAdmin(locals.user);
  let datasets = await listOpsDatasetsPublic();
  let autoSeeded: string[] = [];
  if (datasets.length === 0) {
    const result = await seedOpsDatasetsFromEnv();
    autoSeeded = result.names;
    datasets = await listOpsDatasetsPublic();
  }
  return { datasets, autoSeeded };
};

export const actions: Actions = {
  seed: async ({ locals }) => {
    requireAdmin(locals.user);
    try {
      const result = await seedOpsDatasetsFromEnv();
      return {
        seeded: true,
        inserted: result.inserted,
        names: result.names,
      };
    } catch (e) {
      return fail(500, {
        message: e instanceof Error ? e.message : String(e),
      });
    }
  },

  create: async ({ request, locals }) => {
    requireAdmin(locals.user);
    const form = await request.formData();
    const name = String(form.get("name") ?? "")
      .trim()
      .toLowerCase();
    const label = String(form.get("label") ?? "").trim();
    const connectionString = String(form.get("connectionString") ?? "").trim();
    const enabled = form.get("enabled") === "on" || form.get("enabled") === "true";

    if (!isValidDatasetName(name)) {
      return fail(400, {
        message:
          "Name must start with a letter and use lowercase letters, digits, hyphens.",
      });
    }
    if (!label) {
      return fail(400, { message: "Label is required." });
    }
    if (!connectionString) {
      return fail(400, { message: "Connection string is required for a new dataset." });
    }

    try {
      await upsertOpsDataset({ name, label, connectionString, enabled });
      return { saved: true, name };
    } catch (e) {
      const pgCode =
        e && typeof e === "object"
          ? ((e as { cause?: { code?: string }; code?: string }).cause?.code ??
            (e as { code?: string }).code)
          : undefined;
      if (pgCode === "23505") {
        return fail(400, { message: `Dataset "${name}" already exists.` });
      }
      return fail(400, {
        message: e instanceof Error ? e.message : String(e),
      });
    }
  },

  update: async ({ request, locals }) => {
    requireAdmin(locals.user);
    const form = await request.formData();
    const id = String(form.get("id") ?? "").trim();
    const name = String(form.get("name") ?? "")
      .trim()
      .toLowerCase();
    const label = String(form.get("label") ?? "").trim();
    const connectionStringRaw = String(form.get("connectionString") ?? "").trim();
    const enabled = form.get("enabled") === "on" || form.get("enabled") === "true";

    if (!id) {
      return fail(400, { message: "Missing dataset id." });
    }
    if (!isValidDatasetName(name)) {
      return fail(400, {
        message:
          "Name must start with a letter and use lowercase letters, digits, hyphens.",
      });
    }
    if (!label) {
      return fail(400, { message: "Label is required." });
    }

    try {
      await upsertOpsDataset({
        id,
        name,
        label,
        enabled,
        ...(connectionStringRaw ? { connectionString: connectionStringRaw } : {}),
      });
      return { saved: true, name };
    } catch (e) {
      const pgCode =
        e && typeof e === "object"
          ? ((e as { cause?: { code?: string }; code?: string }).cause?.code ??
            (e as { code?: string }).code)
          : undefined;
      if (pgCode === "23505") {
        return fail(400, { message: `Dataset name "${name}" is already taken.` });
      }
      return fail(400, {
        message: e instanceof Error ? e.message : String(e),
      });
    }
  },
};
