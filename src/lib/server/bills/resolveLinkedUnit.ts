import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from '../schema';
import { unitBillAccounts, units } from '../schema';

type Db = NodePgDatabase<typeof schema>;

export type ResolveLinkedUnitInput = {
	category: string;
	vendor: string;
	serviceAccountNumber: string | null;
};

/**
 * Find a unit for a parsed bill using the same keys as monthly batch:
 * first `unit_bill_accounts` (vendor + category + account), then for utility
 * bills `units.utility_account_number`.
 */
export async function resolveLinkedUnit(
	db: Db,
	input: ResolveLinkedUnitInput
): Promise<string | null> {
	const acct = input.serviceAccountNumber?.trim();
	if (!acct) return null;

	const fromAccounts = await db
		.select({ unitId: unitBillAccounts.unitId })
		.from(unitBillAccounts)
		.innerJoin(units, eq(unitBillAccounts.unitId, units.id))
		.where(
			and(
				eq(unitBillAccounts.vendor, input.vendor),
				eq(unitBillAccounts.category, input.category),
				eq(unitBillAccounts.serviceAccountNumber, acct),
				eq(unitBillAccounts.active, true),
				eq(units.active, true)
			)
		)
		.limit(2);

	if (fromAccounts.length === 1) {
		return fromAccounts[0].unitId;
	}
	if (fromAccounts.length > 1) {
		return null;
	}

	if (input.category !== 'utility') {
		return null;
	}

	const fromUtility = await db
		.select({ id: units.id })
		.from(units)
		.where(and(eq(units.utilityAccountNumber, acct), eq(units.active, true)))
		.limit(2);

	if (fromUtility.length === 1) {
		return fromUtility[0].id;
	}
	return null;
}
