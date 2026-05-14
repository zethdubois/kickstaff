import {
  klogWithSource,
  registerCommand,
  type CommandOutcome,
  type KlogLevel,
} from "$lib/devConsole";
import { helloWorld, type KlogBroadcaster } from "kickagent";
import type { SessionUser } from "$lib/server/auth";

function createDemoLogger(source: string): KlogBroadcaster {
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

export function registerKickagentHelloCommand(user: SessionUser): void {
  registerCommand("kickagent:hello", async (): Promise<CommandOutcome> => {
    const logger = createDemoLogger("kickagent:hello");
    const result = await helloWorld(user.id, user.email, logger);
    return {
      log: result.message,
      level: "info",
    };
  });
}
