import type { Actions, PageServerLoad } from './$types';
import { error, fail } from '@sveltejs/kit';
import { and, asc, eq } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { requireAdmin } from '$lib/server/guards';
import { billCategories, unitBillAccounts, units } from '$lib/server/schema';

function str(form: FormData, key: string) {
	const v = form.get(key);
	return v == null ? '' : String(v).trim();
}

function strOrNull(form: FormData, key: string) {
	const v = str(form, key);
	return v.length ? v : null;
}

async function loadUnit(id: string) {
	const db = getDb();
	const rows = await db.select().from(units).where(eq(units.id, id)).limit(1);
	if (!rows[0]) throw error(404, 'Unit not found');
	const accounts = await db
		.select()
		.from(unitBillAccounts)
		.where(eq(unitBillAccounts.unitId, id))
		.orderBy(
			asc(unitBillAccounts.category),
			asc(unitBillAccounts.vendor),
			asc(unitBillAccounts.serviceAccountNumber)
		);
	return { unit: rows[0], accounts };
}

export const load: PageServerLoad = async ({ locals, params, url }) => {
	requireAdmin(locals.user);
	const { unit, accounts } = await loadUnit(params.id);
	const prefill = {
		serviceAccountNumber: url.searchParams.get('prefill_account') ?? '',
		vendor: url.searchParams.get('vendor') ?? '',
		city: url.searchParams.get('city') ?? '',
		category: url.searchParams.get('category') ?? ''
	};
	return { unit, accounts, prefill, categories: billCategories };
};

export const actions: Actions = {
	updateUnit: async ({ request, locals, params }) => {
		requireAdmin(locals.user);
		const form = await request.formData();
		const label = str(form, 'label');
		const billPropertyCode = str(form, 'bill_property_code');
		if (!label) return fail(400, { message: 'Label is required.' });
		if (!billPropertyCode) return fail(400, { message: 'Bill property code is required.' });

		const db = getDb();
		try {
			await db
				.update(units)
				.set({
					label,
					streetAddress: strOrNull(form, 'street_address'),
					city: strOrNull(form, 'city'),
					state: strOrNull(form, 'state'),
					postalCode: strOrNull(form, 'postal_code'),
					utilityAccountNumber: strOrNull(form, 'utility_account_number'),
					notes: strOrNull(form, 'notes'),
					billPropertyCode,
					billUnitName: strOrNull(form, 'bill_unit_name'),
					active: form.get('active') !== null,
					updatedAt: new Date()
				})
				.where(eq(units.id, params.id));
			return { unitUpdated: true as const };
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return fail(400, { message });
		}
	},
	addAccount: async ({ request, locals, params }) => {
		requireAdmin(locals.user);
		const form = await request.formData();
		const category = str(form, 'category') || 'utility';
		const vendor = str(form, 'vendor');
		const city = str(form, 'city');
		const serviceAccountNumber = str(form, 'service_account_number');
		const vendorPayeeName = str(form, 'vendor_payee_name');
		const billAccount = str(form, 'bill_account');
		if (!vendor) return fail(400, { message: 'Vendor is required.' });
		if (!city) return fail(400, { message: 'City is required.' });
		if (!serviceAccountNumber) return fail(400, { message: 'Service account number is required.' });
		if (!vendorPayeeName) return fail(400, { message: 'Vendor payee name is required.' });
		if (!billAccount) return fail(400, { message: 'Bill account is required.' });

		const db = getDb();
		try {
			await db.insert(unitBillAccounts).values({
				unitId: params.id,
				category,
				vendor,
				city,
				serviceAccountNumber,
				serviceAddressNormalized: strOrNull(form, 'service_address_normalized'),
				vendorPayeeName,
				billAccount,
				defaultDescriptionTemplate: strOrNull(form, 'default_description_template'),
				cashAccount: strOrNull(form, 'cash_account'),
				active: form.get('active') !== null
			});
			return { accountAdded: true as const, serviceAccountNumber };
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return fail(400, { message });
		}
	},
	updateAccount: async ({ request, locals, params }) => {
		requireAdmin(locals.user);
		const form = await request.formData();
		const accountId = str(form, 'account_id');
		if (!accountId) return fail(400, { message: 'Account ID is required.' });
		const category = str(form, 'category') || 'utility';
		const vendor = str(form, 'vendor');
		const city = str(form, 'city');
		const serviceAccountNumber = str(form, 'service_account_number');
		const vendorPayeeName = str(form, 'vendor_payee_name');
		const billAccount = str(form, 'bill_account');
		if (!vendor || !city || !serviceAccountNumber || !vendorPayeeName || !billAccount) {
			return fail(400, { message: 'All required account fields must be provided.' });
		}

		const db = getDb();
		try {
			await db
				.update(unitBillAccounts)
				.set({
					category,
					vendor,
					city,
					serviceAccountNumber,
					serviceAddressNormalized: strOrNull(form, 'service_address_normalized'),
					vendorPayeeName,
					billAccount,
					defaultDescriptionTemplate: strOrNull(form, 'default_description_template'),
					cashAccount: strOrNull(form, 'cash_account'),
					active: form.get('active') !== null,
					updatedAt: new Date()
				})
				.where(and(eq(unitBillAccounts.id, accountId), eq(unitBillAccounts.unitId, params.id)));
			return { accountUpdated: true as const, accountId };
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return fail(400, { message });
		}
	},
	deleteAccount: async ({ request, locals, params }) => {
		requireAdmin(locals.user);
		const form = await request.formData();
		const accountId = str(form, 'account_id');
		if (!accountId) return fail(400, { message: 'Account ID is required.' });
		const db = getDb();
		try {
			await db
				.delete(unitBillAccounts)
				.where(and(eq(unitBillAccounts.id, accountId), eq(unitBillAccounts.unitId, params.id)));
			return { accountDeleted: true as const, accountId };
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return fail(400, { message });
		}
	}
};
