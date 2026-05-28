import {
  klogWithSource,
  type CommandOutcome,
  type KlogLevel,
} from "$lib/devConsole";
import { registerKickagentCommand } from "$lib/kickagent/commands";
import {
  BROWSER_PLUGIN_CATALOG,
  type KlogBroadcaster,
} from "$lib/kickagent/browserPluginCatalog";
import type { KickagentHostContext } from "kickagent";
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
 * CLI/DB commands are not registered in the browser bundle.
 */
export function registerKickagentCatalogCommands(user: SessionUser): void {
  for (const cmd of BROWSER_PLUGIN_CATALOG) {
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
