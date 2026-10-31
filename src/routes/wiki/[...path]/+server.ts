/**
 * Proxy `/wiki/*` → kickagent same path.
 * @see docs/guides/contracts/kickstaff-wiki-progress-proxy.md
 */
import { kickagentPathHandlers } from '$lib/server/kickagentPathHandlers';

export const { GET, HEAD, POST, PUT, DELETE } = kickagentPathHandlers();
