import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import type { CommandOutcome } from "$lib/kickagent/contracts";
import type { DbTarget } from "$lib/server/dbTarget";
import { getActiveDbTarget } from "$lib/server/dbTarget";
import { buildKickagentSpawnEnv } from "$lib/server/kickagentEnv";
import {
  resolveKickagentApiBaseUrl,
  runKickagentCatalogCommandViaApi,
} from "$lib/server/kickagentRemoteRun";

/** Kickagent repo root (sibling checkout by default). */
export function resolveKickagentRepo(): string {
  const fromEnv = process.env.KICKAGENT_REPO?.trim();
  if (fromEnv) return resolve(fromEnv);
  return resolve(process.cwd(), "../kickagent");
}

export function resolveKickagentCliPath(): string {
  const fromCli = process.env.KICKAGENT_CLI?.trim();
  if (fromCli) return resolve(fromCli);
  return join(resolveKickagentRepo(), "dist/cli.js");
}

export type RunKickagentCatalogOptions = {
  command: string;
  args: string[];
  userId: string;
  userEmail: string;
  /** Defaults to publicweb active DB target (`db` / `db use` / cookie). */
  db?: DbTarget;
};

/**
 * Run a kickagent catalog command via `node dist/cli.js run … --json`.
 * Merges SvelteKit private env, kickagent `.env`, and `--db` for the active target.
 */
export function runKickagentCatalogCommand(
  options: RunKickagentCatalogOptions,
): Promise<CommandOutcome> {
  const db = options.db ?? getActiveDbTarget();
  const apiBase = resolveKickagentApiBaseUrl();
  const cli = resolveKickagentCliPath();
  const preferApi =
    process.env.KICKAGENT_USE_API === "1" ||
    process.env.KICKAGENT_USE_API === "true";

  if (apiBase && (preferApi || !existsSync(cli))) {
    return runKickagentCatalogCommandViaApi({ ...options, db });
  }

  if (!existsSync(cli)) {
    return Promise.reject(
      new Error(
        `kickagent CLI not found at ${cli} and no API URL — set KICKAGENT_REPO, KICKAGENT_API_URL, or PUBLIC_KICKAGENT_MANIFEST_URL`,
      ),
    );
  }

  const repo = resolveKickagentRepo();
  const argv = [
    cli,
    "run",
    options.command,
    ...options.args,
    "--db",
    db,
    "--json",
    "--userId",
    options.userId,
    "--userEmail",
    options.userEmail,
  ];
  const childEnv = buildKickagentSpawnEnv(repo, db);

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, argv, {
      cwd: repo,
      env: childEnv,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("error", (err) => reject(err));
    child.on("close", (code) => {
      if (code !== 0) {
        const msg =
          stderr.trim() ||
          stdout.trim() ||
          `kickagent run exited with code ${code ?? "unknown"}`;
        reject(new Error(msg));
        return;
      }

      const trimmed = stdout.trim();
      if (!trimmed) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(trimmed) as CommandOutcome);
      } catch {
        reject(
          new Error(
            `kickagent run returned non-JSON stdout: ${trimmed.slice(0, 240)}`,
          ),
        );
      }
    });
  });
}
