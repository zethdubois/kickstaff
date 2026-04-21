import { createHash } from 'node:crypto';
import { eq, and } from 'drizzle-orm';
import { getDb } from '../db';
import { utilityBillDocuments } from '../schema';
import { buildUtilityBillStorageKey, putUtilityBillObject } from '../storage';

function getYearMonth(now: Date) {
	const year = String(now.getUTCFullYear());
	const month = String(now.getUTCMonth() + 1).padStart(2, '0');
	return { year, month };
}

export async function ingestUtilityBillPdf(params: {
	pdfBuffer: Buffer;
	fileName: string;
	vendor: string;
	city: string;
	sourceMessageId?: string;
}) {
	const db = getDb();
	const sha256 = createHash('sha256').update(params.pdfBuffer).digest('hex');
	const existing = await db
		.select({ id: utilityBillDocuments.id })
		.from(utilityBillDocuments)
		.where(and(eq(utilityBillDocuments.vendor, params.vendor), eq(utilityBillDocuments.sha256, sha256)))
		.limit(1);
	if (existing.length > 0) {
		return { status: 'duplicate_skipped' as const, id: existing[0].id, sha256 };
	}

	const now = new Date();
	const { year, month } = getYearMonth(now);
	const storageKey = buildUtilityBillStorageKey({
		kind: 'raw',
		vendor: params.vendor,
		year,
		month,
		sourceMessageId: params.sourceMessageId,
		fileName: params.fileName
	});

	await putUtilityBillObject({
		key: storageKey,
		body: params.pdfBuffer,
		contentType: 'application/pdf',
		metadata: {
			vendor: params.vendor,
			city: params.city,
			sha256
		}
	});

	const rows = await db
		.insert(utilityBillDocuments)
		.values({
			vendor: params.vendor,
			city: params.city,
			storageKey,
			sha256,
			emailMessageId: params.sourceMessageId,
			sourceFilename: params.fileName,
			parseStatus: 'received'
		})
		.returning({ id: utilityBillDocuments.id });

	return { status: 'ingested' as const, id: rows[0].id, sha256, storageKey };
}
