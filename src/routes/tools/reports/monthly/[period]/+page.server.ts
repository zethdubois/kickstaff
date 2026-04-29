/**
 * @docs-order
 * 1) /home/golem/projects/publicweb/AGENTS.md
 * 2) /home/golem/projects/publicweb/docs/guides/tools-architecture.md
 * 3) /home/golem/projects/publicweb/docs/guides/tools-ui-map.md
 */
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireAdmin } from '$lib/server/guards';
import { loadMonthlyMetrics, parsePeriod } from '$lib/server/bills/monthlyMetrics';

export const load: PageServerLoad = async ({ params, locals }) => {
	requireAdmin(locals.user);
	try {
		parsePeriod(params.period);
	} catch {
		throw error(400, 'Invalid month — expected format YYYY-MM.');
	}
	const metrics = await loadMonthlyMetrics(params.period);
	return { period: params.period, metrics };
};
