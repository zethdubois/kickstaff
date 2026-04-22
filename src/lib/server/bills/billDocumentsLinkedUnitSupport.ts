import { desc, eq, getTableColumns } from 'drizzle-orm';
import { getDb } from '../db';
import {
	enrichBillDocumentsImplicitLink,
	type AdminBillDocRow
} from './enrichBillDocumentsImplicitLink';
import { billDocuments, units } from '../schema';

type Db = ReturnType<typeof getDb>;

/** Once we see `linked_unit_id`, stay on the fast path until process restart. */
let linkedUnitColumnKnownGood = false;

/**
 * True if `bill_documents.linked_unit_id` exists in the connected database.
 * Uses a trivial SELECT. We only cache `true` so a later `pnpm db:migrate` is picked up
 * without restarting the dev server; when the column is missing, each call re-probes once.
 */
export async function supportsBillDocumentLinkedUnit(db: Db): Promise<boolean> {
	if (linkedUnitColumnKnownGood) return true;
	try {
		await db.select({ _x: billDocuments.linkedUnitId }).from(billDocuments).limit(1);
		linkedUnitColumnKnownGood = true;
		return true;
	} catch {
		return false;
	}
}

/** Bill document columns excluding `linked_unit_id` (for DBs not yet migrated). */
export function billDocumentColumnsWithoutLinkedUnit() {
	const { linkedUnitId: _omit, ...rest } = getTableColumns(billDocuments);
	return rest;
}

/** Recent bill rows for Tools / admin APIs, with optional unit label when the FK column exists. */
export async function loadBillDocumentsForAdmin(db: Db, limit = 100) {
	const link = await supportsBillDocumentLinkedUnit(db);
	let docs: AdminBillDocRow[];
	if (link) {
		docs = await db
			.select({
				...getTableColumns(billDocuments),
				linkedUnitLabel: units.label
			})
			.from(billDocuments)
			.leftJoin(units, eq(billDocuments.linkedUnitId, units.id))
			.orderBy(desc(billDocuments.createdAt))
			.limit(limit);
	} else {
		const rows = await db
			.select(billDocumentColumnsWithoutLinkedUnit())
			.from(billDocuments)
			.orderBy(desc(billDocuments.createdAt))
			.limit(limit);
		docs = rows.map(
			(r) =>
				({
					...r,
					linkedUnitId: null,
					linkedUnitLabel: null
				}) as AdminBillDocRow
		);
	}
	return enrichBillDocumentsImplicitLink(db, docs);
}

/** For tests or long-running workers after a migration in-process. */
export function resetBillDocumentLinkedUnitSupportCache(): void {
	linkedUnitColumnKnownGood = false;
}
