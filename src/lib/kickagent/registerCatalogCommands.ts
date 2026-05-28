import {
  klogWithSource,
  type CommandOutcome,
  type KlogLevel,
} from "$lib/devConsole";
import { registerKickagentCommand } from "$lib/kickagent/commands";
import { PLUGIN_COMMAND_CATALOG } from "kickagent/plugin";
import type { KickagentHostContext, KlogBroadcaster } from "kickagent";
import type { SessionUser } from "$lib/server/auth";

function createKamLogger(source: string): KlogBroadcaster {
  const emit = (level: KlogLevel, message: string): void => {
    klogWithSource(level, source, message);
  };

  return {
    log: (message: string): void => emit("log", message),
    info: (message: string): void => emit("info", message),
    warn: (message: string): void => emit("warn", message),
    error: (message: string): void => emit("error", message),
  };
}

/**
 * Phase 1: register browser-safe plugin commands only (hello, foo).
 * CLI/DB commands (units-list, units-import-af) live in full COMMAND_CATALOG
 * and must not be imported here — they pull `pg` into the client bundle.
 */
export function registerKickagentCatalogCommands(user: SessionUser): void {
  for (const cmd of PLUGIN_COMMAND_CATALOG) {
    const source = `kickagent:${cmd.name}`;
    registerKickagentCommand(cmd.name, async (args): Promise<CommandOutcome | void> => {
      const ctx: KickagentHostContext = {
        userId: user.id,
        userEmail: user.email,
        logger: createKamLogger(source),
      };
      return cmd.handler(args, ctx);
    });
  }
}
