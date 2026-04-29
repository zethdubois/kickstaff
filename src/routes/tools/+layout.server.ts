/**
 * @docs-order
 * 1) /home/golem/projects/publicweb/AGENTS.md
 * 2) /home/golem/projects/publicweb/docs/guides/tools-architecture.md
 * 3) /home/golem/projects/publicweb/docs/guides/tools-ui-map.md
 */
import type { LayoutServerLoad } from './$types';
import { requireAdmin } from '$lib/server/guards';

export const load: LayoutServerLoad = async ({ locals }) => {
	requireAdmin(locals.user);
	return {};
};
