import type { CommandOutcome } from "$lib/kickagent/contracts";
import { registerKickagentCommand } from "$lib/devConsole/commands";
import type { CachedManifestCommand } from "./manifestCommandCache";

/**
 * Register handlers for manifest commands not provided by the browser ESM plugin
 * (CLI/DB units commands, etc.). Runs on the server via POST /api/kickagent/run.
 */
export function registerManifestServerCommands(
  manifestCommands: CachedManifestCommand[],
  pluginCommandNames: ReadonlySet<string>,
): void {
  for (const cmd of manifestCommands) {
    if (pluginCommandNames.has(cmd.name)) continue;

    registerKickagentCommand(cmd.name, async (args): Promise<CommandOutcome> => {
      const res = await fetch("/api/kickagent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: cmd.name, args }),
      });

      const payload = (await res.json()) as {
        outcome?: CommandOutcome;
        message?: string;
      };

      if (!res.ok) {
        throw new Error(payload.message ?? `kickagent run failed (${res.status})`);
      }

      return payload.outcome ?? {};
    });
  }
}
