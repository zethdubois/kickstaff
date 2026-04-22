import { and, eq, inArray, or } from 'drizzle-orm';
import { getDb } from '../db';
import { billDocuments, unitBillAccounts, units } from '../schema';

type Db = ReturnType<typeof getDb>;

/** Shape returned by admin bill list loaders (subset used for resolution). */
export type AdminBillDocRow = typeof billDocuments.$inferSelect & {
	linkedUnitLabel: string | null;
};

/**
 * When `linked_unit_id` is still null, infer the unit from `unit_bill_accounts`
 * (vendor + category + account) or from `units.utility_account_number` for utility bills.
 * Matches the logic in `resolveLinkedUnit`, but batched for the list view.
 */
export async function enrichBillDocumentsImplicitLink(
	db: Db,
	docs: AdminBillDocRow[]
): Promise<AdminBillDocRow[]> {
	const toResolve = docs.filter(
		(d) =>
			d.parseStatus === 'parsed' &&
			d.serviceAccountNumber &&
			!d.linkedUnitId
	);
	if (toResolve.length === 0) return docs;

	const tripleKeys = new Map<string, { vendor: string; category: string; account: string }>();
	for (const d of toResolve) {
		const account = d.serviceAccountNumber!.trim();
		if (!account) continue;
		const key = `${d.vendor}\0${d.category}\0${account}`;
		tripleKeys.set(key, { vendor: d.vendor, category: d.category, account });
	}

	const byTriple = new Map<string, { unitId: string; label: string }>();

	if (tripleKeys.size > 0) {
		const orClauses = [...tripleKeys.values()].map((t) =>
			and(
				eq(unitBillAccounts.vendor, t.vendor),
				eq(unitBillAccounts.category, t.category),
				eq(unitBillAccounts.serviceAccountNumber, t.account),
				eq(unitBillAccounts.active, true)
			)
		);
		const ubaRows = await db
			.select({ uba: unitBillAccounts, unit: units })
			.from(unitBillAccounts)
			.innerJoin(units, eq(unitBillAccounts.unitId, units.id))
			.where(and(eq(units.active, true), or(...orClauses)));

		for (const row of ubaRows) {
			const t = row.uba;
			const key = `${t.vendor}\0${t.category}\0${t.serviceAccountNumber.trim()}`;
			byTriple.set(key, { unitId: row.unit.id, label: row.unit.label });
		}
	}

	const stillUtility = toResolve.filter(
		(d) => d.category === 'utility' && d.serviceAccountNumber && !d.linkedUnitId
	);
	const utilAccounts = [
		...new Set(
			stillUtility
				.map((d) => d.serviceAccountNumber!.trim())
				.filter(Boolean)
		)
	];
	const utilByAccount = new Map<string, { unitId: string; label: string }>();
	if (utilAccounts.length > 0) {
		const urows = await db
			.select({
				id: units.id,
				label: units.label,
				utilityAccountNumber: units.utilityAccountNumber
			})
			.from(units)
			.where(and(eq(units.active, true), inArray(units.utilityAccountNumber, utilAccounts)));
		for (const u of urows) {
			if (u.utilityAccountNumber) {
				utilByAccount.set(u.utilityAccountNumber.trim(), {
					unitId: u.id,
					label: u.label
				});
			}
		}
	}

	return docs.map((d) => {
		if (d.linkedUnitId || d.parseStatus !== 'parsed' || !d.serviceAccountNumber) {
			return d;
		}
		const account = d.serviceAccountNumber.trim();
		if (!account) return d;

		const tkey = `${d.vendor}\0${d.category}\0${account}`;
		let hit = byTriple.get(tkey);
		if (!hit && d.category === 'utility') {
			hit = utilByAccount.get(account);
		}
		if (!hit) return d;

		return {
			...d,
			linkedUnitId: hit.unitId,
			linkedUnitLabel: hit.label
		};
	});
}
