/** Id + email for KickagentHostContext at command runtime (no server imports). */
export type KickagentPluginUser = { id: string; email: string };

let current: KickagentPluginUser | null = null;

export function setKickagentPluginSessionUser(user: KickagentPluginUser | null): void {
  current = user;
}

export function getKickagentPluginSessionUser(): KickagentPluginUser | null {
  return current;
}
