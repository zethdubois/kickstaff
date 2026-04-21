import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { desc, eq } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { requireAdmin } from '$lib/server/guards';
import { utilityBillMonthlyFiles } from '$lib/server/schema';
import { generateMonthlyCsvQueueFile, transitionMonthlyCsvStatus } from '$lib/server/utilityBills/monthlyCsv';

function currentPeriod() {
	const now = new Date();
	return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

export const load: PageServerLoad = async ({ locals }) => {
	requireAdmin(locals.user);
	const db = getDb();
	const files = await db
		.select()
		.from(utilityBillMonthlyFiles)
		.orderBy(desc(utilityBillMonthlyFiles.createdAt))
		.limit(100);
	return { files, defaults: { vendor: 'city-of-moscow', city: 'mos', period: currentPeriod() } };
};

export const actions: Actions = {
	generate: async ({ request, locals }) => {
		requireAdmin(locals.user);
		const form = await request.formData();
		const vendor = String(form.get('vendor') ?? '').trim();
		const city = String(form.get('city') ?? '').trim();
		const period = String(form.get('period') ?? '').trim();
		if (!vendor) return fail(400, { message: 'Vendor is required.' });
		if (!city) return fail(400, { message: 'City is required.' });
		if (!period) return fail(400, { message: 'Period is required.' });
		try {
			const created = await generateMonthlyCsvQueueFile({ vendor, city, period });
			return { generated: true as const, ...created };
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return fail(400, { message });
		}
	},
	markProcessing: async ({ request, locals }) => {
		requireAdmin(locals.user);
		const form = await request.formData();
		const id = String(form.get('id') ?? '').trim();
		if (!id) return fail(400, { message: 'File ID is required.' });
		try {
			await transitionMonthlyCsvStatus(id, 'processing');
			return { markedProcessing: true as const, id };
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return fail(400, { message });
		}
	},
	markDone: async ({ request, locals }) => {
		requireAdmin(locals.user);
		const form = await request.formData();
		const id = String(form.get('id') ?? '').trim();
		if (!id) return fail(400, { message: 'File ID is required.' });
		try {
			await transitionMonthlyCsvStatus(id, 'done');
			return { markedDone: true as const, id };
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return fail(400, { message });
		}
	}
};
