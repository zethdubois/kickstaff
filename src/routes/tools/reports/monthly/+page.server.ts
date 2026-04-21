import type { PageServerLoad } from './$types';
import { requireAdmin } from '$lib/server/guards';
import { currentPeriod, loadMonthlyMetrics } from '$lib/server/bills/monthlyMetrics';

export const load: PageServerLoad = async ({ locals }) => {
	requireAdmin(locals.user);
	const period = currentPeriod();
	const metrics = await loadMonthlyMetrics(period);
	return { period, metrics };
};
