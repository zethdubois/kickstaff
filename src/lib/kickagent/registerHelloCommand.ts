import type { SessionUser } from "$lib/server/auth";
import { registerKickagentCatalogCommands } from "./registerCatalogCommands";

/** @deprecated Use registerKickagentCatalogCommands — registers full COMMAND_CATALOG. */
export function registerKickagentHelloCommand(user: SessionUser): void {
  registerKickagentCatalogCommands(user);
}
