import { and, eq } from 'drizzle-orm';
import { getDb } from '../db';
import { billDocuments } from '../schema';
import { supportsBillDocumentLinkedUnit } from './billDocumentsLinkedUnitSupport';

type Db = ReturnType<typeof getDb>;

/**
 * After a `unit_bill_accounts` row is added or updated, attach matching parsed
 * documents so the Bills UI shows "Linked" without re-parsing the PDF.
 */
export async function relinkParsedBillsForBillAccount(
	db: Db,
	params: {
		unitId: string;
		category: string;
		vendor: string;
		serviceAccountNumber: string;
	}
): Promise<number> {
	const link = await supportsBillDocumentLinkedUnit(db);
	if (!link) return 0;
	const acct = params.serviceAccountNumber.trim();
	if (!acct) return 0;

	const updated = await db
		.update(billDocuments)
		.set({ linkedUnitId: params.unitId, updatedAt: new Date() })
		.where(
			and(
				eq(billDocuments.parseStatus, 'parsed'),
				eq(billDocuments.category, params.category),
				eq(billDocuments.vendor, params.vendor),
				eq(billDocuments.serviceAccountNumber, acct)
			)
		)
		.returning({ id: billDocuments.id });

	return updated.length;
}

/**
 * When `units.utility_account_number` is set, link parsed utility bills that
 * match that account (same as parse-time fallback).
 */
export async function relinkParsedUtilityBillsByUnitPrimaryAccount(
	db: Db,
	unitId: string,
	utilityAccountNumber: string | null
): Promise<number> {
	const link = await supportsBillDocumentLinkedUnit(db);
	if (!link) return 0;
	const acct = utilityAccountNumber?.trim();
	if (!acct) return 0;

	const updated = await db
		.update(billDocuments)
		.set({ linkedUnitId: unitId, updatedAt: new Date() })
		.where(
			and(
				eq(billDocuments.parseStatus, 'parsed'),
				eq(billDocuments.category, 'utility'),
				eq(billDocuments.serviceAccountNumber, acct)
			)
		)
		.returning({ id: billDocuments.id });

	return updated.length;
}
