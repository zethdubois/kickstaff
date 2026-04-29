/**
 * @docs-order
 * 1) /home/golem/projects/publicweb/AGENTS.md
 * 2) /home/golem/projects/publicweb/docs/guides/tools-architecture.md
 * 3) /home/golem/projects/publicweb/docs/guides/tools-ui-map.md
 */
import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { asc, eq, sql } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { requireAdmin } from '$lib/server/guards';
import { unitBillAccounts, units } from '$lib/server/schema';

export const load: PageServerLoad = async ({ locals, url }) => {
	requireAdmin(locals.user);
	const db = getDb();

	const rows = await db
		.select({
			id: units.id,
			label: units.label,
			streetAddress: units.streetAddress,
			city: units.city,
			state: units.state,
			postalCode: units.postalCode,
			utilityAccountNumber: units.utilityAccountNumber,
			billPropertyCode: units.billPropertyCode,
			billUnitName: units.billUnitName,
			active: units.active,
			accountCount: sql<number>`count(${unitBillAccounts.id})::int`
		})
		.from(units)
		.leftJoin(unitBillAccounts, eq(unitBillAccounts.unitId, units.id))
		.groupBy(units.id)
		.orderBy(asc(units.label));

	const prefill = {
		category: url.searchParams.get('category') ?? '',
		vendor: url.searchParams.get('vendor') ?? '',
		city: url.searchParams.get('city') ?? '',
		serviceAccountNumber: url.searchParams.get('service_account_number') ?? ''
	};

	return { units: rows, prefill };
};

function str(form: FormData, key: string) {
	const v = form.get(key);
	return v == null ? '' : String(v).trim();
}

function strOrNull(form: FormData, key: string) {
	const v = str(form, key);
	return v.length ? v : null;
}

export const actions: Actions = {
	create: async ({ request, locals }) => {
		requireAdmin(locals.user);
		const form = await request.formData();
		const label = str(form, 'label');
		const billPropertyCode = str(form, 'bill_property_code');
		if (!label) return fail(400, { message: 'Label is required.' });
		if (!billPropertyCode) return fail(400, { message: 'Bill property code is required.' });

		const db = getDb();
		let newId: string;
		try {
			const inserted = await db
				.insert(units)
				.values({
					label,
					streetAddress: strOrNull(form, 'street_address'),
					city: strOrNull(form, 'city'),
					state: strOrNull(form, 'state'),
					postalCode: strOrNull(form, 'postal_code'),
					utilityAccountNumber: strOrNull(form, 'utility_account_number'),
					notes: strOrNull(form, 'notes'),
					billPropertyCode,
					billUnitName: strOrNull(form, 'bill_unit_name'),
					active: form.get('active') !== null
				})
				.returning({ id: units.id });
			newId = inserted[0].id;
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return fail(400, { message });
		}
		throw redirect(303, `/tools/units/${newId}`);
	},
	delete: async ({ request, locals }) => {
		requireAdmin(locals.user);
		const form = await request.formData();
		const id = str(form, 'id');
		if (!id) return fail(400, { message: 'Unit ID is required.' });
		const db = getDb();
		try {
			await db.delete(units).where(eq(units.id, id));
			return { deleted: true as const, id };
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return fail(400, { message });
		}
	}
};
