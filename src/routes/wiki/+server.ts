/**
 * Proxy `/wiki` → kickagent `/wiki` (Bearer + user headers).
 * @see docs/guides/contracts/kickstaff-wiki-progress-proxy.md
 */
import { kickagentPathHandlers } from '$lib/server/kickagentPathHandlers';

export const { GET, HEAD, POST, PUT, DELETE } = kickagentPathHandlers();
