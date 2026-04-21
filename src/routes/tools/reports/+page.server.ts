import { and, eq, sql } from 'drizzle-orm';
import { fail, type Actions, type PageServerLoad } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { requireAdmin } from '$lib/server/guards';
import { billDocuments } from '$lib/server/schema';

export const load: PageServerLoad = async ({ locals }) => {
	requireAdmin(locals.user);
	const db = getDb();
	const rows = await db
		.select({
			vendor: billDocuments.vendor,
			parsedCount: sql<number>`count(*) filter (where ${billDocuments.parseStatus} = 'parsed')`
		})
		.from(billDocuments)
		.groupBy(billDocuments.vendor)
		.orderBy(billDocuments.vendor);

	const vendors = rows.map((r) => ({ vendor: r.vendor, parsedCount: Number(r.parsedCount) }));
	const totalParsed = vendors.reduce((sum, v) => sum + v.parsedCount, 0);
	return { vendors, totalParsed };
};

async function resetParsedDocuments(vendor: string | null) {
	const db = getDb();
	const where =
		vendor === null
			? eq(billDocuments.parseStatus, 'parsed')
			: and(eq(billDocuments.vendor, vendor), eq(billDocuments.parseStatus, 'parsed'));
	const result = await db
		.update(billDocuments)
		.set({
			parseStatus: 'received',
			parseError: null,
			serviceAccountNumber: null,
			billReference: null,
			billDate: null,
			dueDate: null,
			servicePeriodStart: null,
			servicePeriodEnd: null,
			currentChargesAmount: null,
			rawParseJson: null,
			updatedAt: new Date()
		})
		.where(where)
		.returning({ id: billDocuments.id });
	return result.length;
}

export const actions: Actions = {
	resetVendor: async ({ request, locals }) => {
		requireAdmin(locals.user);
		const form = await request.formData();
		const vendor = String(form.get('vendor') ?? '').trim();
		if (!vendor) return fail(400, { message: 'Vendor is required.' });
		try {
			const updatedCount = await resetParsedDocuments(vendor);
			return { ok: true as const, op: 'resetVendor' as const, vendor, updatedCount };
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return fail(500, { message });
		}
	},
	resetAll: async ({ request, locals }) => {
		requireAdmin(locals.user);
		const form = await request.formData();
		const confirm = String(form.get('confirm') ?? '').trim();
		if (confirm !== 'RESET ALL') {
			return fail(400, {
				message: 'Type RESET ALL in the confirm field to perform a global re-parse.'
			});
		}
		try {
			const updatedCount = await resetParsedDocuments(null);
			return { ok: true as const, op: 'resetAll' as const, updatedCount };
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return fail(500, { message });
		}
	}
};
