/**
 * @docs-order
 * 1) /home/golem/projects/publicweb/AGENTS.md
 * 2) /home/golem/projects/publicweb/docs/guides/tools-architecture.md
 * 3) /home/golem/projects/publicweb/docs/guides/tools-ui-map.md
 */
import type { PageServerLoad } from './$types';
import { requireAdmin } from '$lib/server/guards';
import { currentPeriod, loadMonthlyMetrics } from '$lib/server/bills/monthlyMetrics';

export const load: PageServerLoad = async ({ locals }) => {
	requireAdmin(locals.user);
	const period = currentPeriod();
	const metrics = await loadMonthlyMetrics(period);
	return { period, metrics };
};
