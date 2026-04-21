import { eq } from 'drizzle-orm';
import { getDb } from '../db';
import { billDocuments } from '../schema';
import { getBillObject } from '../storage';
import { resolveBillParser } from './parsers';

export async function parseBillDocumentById(documentId: string) {
	const db = getDb();
	const rows = await db
		.select()
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
		await db
			.update(billDocuments)
			.set({
				serviceAccountNumber: parsed.serviceAccountNumber,
				billReference: parsed.billReference,
				billDate: parsed.billDate,
				dueDate: parsed.dueDate,
				servicePeriodStart: parsed.servicePeriodStart,
				servicePeriodEnd: parsed.servicePeriodEnd,
				currentChargesAmount: parsed.currentChargesAmount,
				parseStatus: 'parsed',
				parseError: null,
				rawParseJson: {
					serviceAddress: parsed.serviceAddress
				},
				updatedAt: new Date()
			})
			.where(eq(billDocuments.id, doc.id));

		return { status: 'parsed' as const, parsed };
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		await db
			.update(billDocuments)
			.set({
				parseStatus: 'failed',
				parseError: message,
				updatedAt: new Date()
			})
			.where(eq(billDocuments.id, doc.id));
		return { status: 'failed' as const, error: message };
	}
}
