/**
 * @docs-order
 * 1) /home/golem/projects/publicweb/AGENTS.md
 * 2) /home/golem/projects/publicweb/docs/guides/tools-bills-architecture.md
 * 3) /home/golem/projects/publicweb/docs/guides/tools-bills-ui-map.md
 */
import type { PageServerLoad } from './$types';
import { requireAdmin } from '$lib/server/guards';

const vendorAndOptions = ['Home Depot', 'Early Bird', 'Moscow Building Supply'] as const;

export const load: PageServerLoad = async ({ locals }) => {
	requireAdmin(locals.user);
	return {
		vendorAndOptions
	};
};
