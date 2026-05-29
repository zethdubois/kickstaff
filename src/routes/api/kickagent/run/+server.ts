import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getActiveDbTarget } from "$lib/server/dbTarget";
import { runKickagentCatalogCommand } from "$lib/server/kickagentCliRun";

type RunBody = {
  command?: unknown;
  args?: unknown;
  db?: unknown;
};

function parseArgs(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") return null;
    out.push(item);
  }
  return out;
}

function parseDb(raw: unknown): "dev" | "prod" | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  if (raw === "dev" || raw === "prod") return raw;
  return undefined;
}

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    return json({ message: "Unauthorized" }, { status: 401 });
  }
  if (locals.user.role !== "admin") {
    return json({ message: "Forbidden" }, { status: 403 });
  }

  let body: RunBody;
  try {
    body = (await request.json()) as RunBody;
  } catch {
    return json({ message: "Invalid JSON" }, { status: 400 });
  }

  const command = typeof body.command === "string" ? body.command.trim() : "";
  if (!command || !/^[a-z][a-z0-9-]*$/.test(command)) {
    return json({ message: "Invalid command name" }, { status: 400 });
  }

  const args = parseArgs(body.args);
  if (args === null) {
    return json({ message: "args must be a string array" }, { status: 400 });
  }

  const dbOverride = parseDb(body.db);
  if (body.db !== undefined && body.db !== null && body.db !== "" && !dbOverride) {
    return json({ message: "db must be dev or prod" }, { status: 400 });
  }
  const db = dbOverride ?? getActiveDbTarget();

  try {
    const outcome = await runKickagentCatalogCommand({
      command,
      args,
      userId: locals.user.id,
      userEmail: locals.user.email,
      db,
    });
    return json({ outcome });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[kickagent/run]", command, e);
    return json({ message }, { status: 500 });
  }
};
