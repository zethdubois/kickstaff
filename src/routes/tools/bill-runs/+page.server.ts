import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { desc } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { requireAdmin } from '$lib/server/guards';
import { billCategories, billMonthlyFiles } from '$lib/server/schema';
import {
	generateMonthlyBatchFile,
	transitionMonthlyBatchStatus
} from '$lib/server/bills/monthlyBatch';

function currentPeriod() {
	const now = new Date();
	return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

export const load: PageServerLoad = async ({ locals }) => {
	requireAdmin(locals.user);
	const db = getDb();
	const files = await db
		.select()
		.from(billMonthlyFiles)
		.orderBy(desc(billMonthlyFiles.createdAt))
		.limit(100);
	return {
		files,
		categories: billCategories,
		defaults: {
			category: 'utility' as const,
			vendor: 'city-of-moscow',
			city: 'mos',
			period: currentPeriod()
		}
	};
};

export const actions: Actions = {
	generate: async ({ request, locals }) => {
		requireAdmin(locals.user);
		const form = await request.formData();
		const category = String(form.get('category') ?? 'utility').trim() || 'utility';
		const vendor = String(form.get('vendor') ?? '').trim();
		const city = String(form.get('city') ?? '').trim();
		const period = String(form.get('period') ?? '').trim();
		if (!vendor) return fail(400, { message: 'Vendor is required.' });
		if (!city) return fail(400, { message: 'City is required.' });
		if (!period) return fail(400, { message: 'Period is required.' });
		try {
			const created = await generateMonthlyBatchFile({ category, vendor, city, period });
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
			await transitionMonthlyBatchStatus(id, 'processing');
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
			await transitionMonthlyBatchStatus(id, 'done');
			return { markedDone: true as const, id };
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return fail(400, { message });
		}
	}
};
