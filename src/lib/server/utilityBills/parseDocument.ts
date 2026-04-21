import { eq } from 'drizzle-orm';
import { getDb } from '../db';
import { utilityBillDocuments } from '../schema';
import { getUtilityBillObject } from '../storage';
import { MoscowUtilityBillParser } from './parsers/moscow';
import type { UtilityBillParser } from './parsers/types';

function parserForCity(city: string): UtilityBillParser {
	if (city === 'mos') {
		return new MoscowUtilityBillParser();
	}
	throw new Error(`No parser configured for city "${city}"`);
}

export async function parseUtilityBillDocumentById(documentId: string) {
	const db = getDb();
	const rows = await db
		.select()
		.from(utilityBillDocuments)
		.where(eq(utilityBillDocuments.id, documentId))
		.limit(1);
	const doc = rows[0];
	if (!doc) {
		throw new Error(`Document "${documentId}" not found`);
	}
	const pdf = await getUtilityBillObject(doc.storageKey);
	const parser = parserForCity(doc.city);

	try {
		const parsed = await parser.parse(pdf);
		await db
			.update(utilityBillDocuments)
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
			.where(eq(utilityBillDocuments.id, doc.id));

		return { status: 'parsed' as const, parsed };
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		await db
			.update(utilityBillDocuments)
			.set({
				parseStatus: 'failed',
				parseError: message,
				updatedAt: new Date()
			})
			.where(eq(utilityBillDocuments.id, doc.id));
		return { status: 'failed' as const, error: message };
	}
}
