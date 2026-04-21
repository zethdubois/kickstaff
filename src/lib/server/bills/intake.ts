import { createHash } from 'node:crypto';
import { eq, and } from 'drizzle-orm';
import { getDb } from '../db';
import { billDocuments } from '../schema';
import { buildBillStorageKey, putBillObject } from '../storage';

function getYearMonth(now: Date) {
	const year = String(now.getUTCFullYear());
	const month = String(now.getUTCMonth() + 1).padStart(2, '0');
	return { year, month };
}

export async function ingestBillPdf(params: {
	pdfBuffer: Buffer;
	fileName: string;
	category?: string;
	vendor: string;
	city: string;
	sourceMessageId?: string;
}) {
	const db = getDb();
	const category = params.category || 'utility';
	const sha256 = createHash('sha256').update(params.pdfBuffer).digest('hex');
	const existing = await db
		.select({ id: billDocuments.id })
		.from(billDocuments)
		.where(and(eq(billDocuments.vendor, params.vendor), eq(billDocuments.sha256, sha256)))
		.limit(1);
	if (existing.length > 0) {
		return { status: 'duplicate_skipped' as const, id: existing[0].id, sha256 };
	}

	const now = new Date();
	const { year, month } = getYearMonth(now);
	const storageKey = buildBillStorageKey({
		kind: 'raw',
		category,
		vendor: params.vendor,
		year,
		month,
		sourceMessageId: params.sourceMessageId,
		fileName: params.fileName
	});

	await putBillObject({
		key: storageKey,
		body: params.pdfBuffer,
		contentType: 'application/pdf',
		metadata: {
			category,
			vendor: params.vendor,
			city: params.city,
			sha256
		}
	});

	const rows = await db
		.insert(billDocuments)
		.values({
			category,
			vendor: params.vendor,
			city: params.city,
			storageKey,
			sha256,
			emailMessageId: params.sourceMessageId,
			sourceFilename: params.fileName,
			parseStatus: 'received'
		})
		.returning({ id: billDocuments.id });

	return { status: 'ingested' as const, id: rows[0].id, sha256, storageKey };
}
