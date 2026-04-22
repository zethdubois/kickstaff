import { eq } from 'drizzle-orm';
import { getDb } from '../db';
import { billDocuments } from '../schema';
import { getBillObject } from '../storage';
import {
	billDocumentColumnsWithoutLinkedUnit,
	supportsBillDocumentLinkedUnit
} from './billDocumentsLinkedUnitSupport';
import { resolveBillParser } from './parsers';
import { resolveLinkedUnit } from './resolveLinkedUnit';

export async function parseBillDocumentById(documentId: string) {
	const db = getDb();
	const linkCol = await supportsBillDocumentLinkedUnit(db);
	const rows = linkCol
		? await db.select().from(billDocuments).where(eq(billDocuments.id, documentId)).limit(1)
		: await db
				.select(billDocumentColumnsWithoutLinkedUnit())
				.from(billDocuments)
				.where(eq(billDocuments.id, documentId))
				.limit(1);
	const doc = rows[0];
	if (!doc) {
		throw new Error(`Document "${documentId}" not found`);
	}
	const pdf = await getBillObject(doc.storageKey);
	const parser = resolveBillParser(doc.category, doc.vendor);

	try {
		const parsed = await parser.parse(pdf);
		const linkedUnitId = await resolveLinkedUnit(db, {
			category: doc.category,
			vendor: doc.vendor,
			serviceAccountNumber: parsed.serviceAccountNumber ?? null
		});
		const baseParsed = {
			serviceAccountNumber: parsed.serviceAccountNumber,
			billReference: parsed.billReference,
			billDate: parsed.billDate,
			dueDate: parsed.dueDate,
			servicePeriodStart: parsed.servicePeriodStart,
			servicePeriodEnd: parsed.servicePeriodEnd,
			currentChargesAmount: parsed.currentChargesAmount,
			parseStatus: 'parsed' as const,
			parseError: null,
			rawParseJson: {
				serviceAddress: parsed.serviceAddress
			},
			updatedAt: new Date()
		};
		await db
			.update(billDocuments)
			.set(
				linkCol ? { ...baseParsed, linkedUnitId } : baseParsed
			)
			.where(eq(billDocuments.id, doc.id));

		return { status: 'parsed' as const, parsed };
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		await db
			.update(billDocuments)
			.set({
				parseStatus: 'failed',
				parseError: message,
				...(linkCol ? { linkedUnitId: null } : {}),
				updatedAt: new Date()
			})
			.where(eq(billDocuments.id, doc.id));
		return { status: 'failed' as const, error: message };
	}
}
