import { and, eq, gte, inArray, lt } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import {
	utilityAccountMappings,
	utilityBillDocuments,
	utilityBillMonthlyFileItems,
	utilityBillMonthlyFiles
} from '$lib/server/schema';
import { buildUtilityBillStorageKey, getUtilityBillObject, putUtilityBillObject } from '$lib/server/storage';

const APPFOLIO_HEADERS = [
	'Bill Property Code*',
	'Bill Unit Name',
	'Vendor Payee Name*',
	'Amount*',
	'Bill Account*',
	'Description',
	'Bill Date*',
	'Due Date*',
	'Posting Date*',
	'Bill Reference',
	'Bill Remarks',
	'Memo For Check',
	'Purchase Order Number',
	'Cash Account'
] as const;

type MonthlyGenerationParams = {
	vendor: string;
	city: string;
	period: string; // YYYY-MM
};

function parsePeriod(period: string) {
	if (!/^\d{4}-\d{2}$/.test(period)) {
		throw new Error('Period must be in YYYY-MM format.');
	}
	const [y, m] = period.split('-').map((x) => Number(x));
	if (!y || !m || m < 1 || m > 12) {
		throw new Error('Invalid period value.');
	}
	const start = `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-01`;
	const nextDate = new Date(Date.UTC(y, m, 1));
	const next = `${nextDate.getUTCFullYear()}-${String(nextDate.getUTCMonth() + 1).padStart(2, '0')}-01`;
	return { year: String(y).padStart(4, '0'), month: String(m).padStart(2, '0'), start, next };
}

function csvEscape(v: string) {
	if (v.includes(',') || v.includes('"') || v.includes('\n')) {
		return `"${v.replace(/"/g, '""')}"`;
	}
	return v;
}

function toCsv(headers: readonly string[], rows: string[][]) {
	const lines: string[] = [];
	lines.push(headers.map(csvEscape).join(','));
	for (const row of rows) lines.push(row.map((x) => csvEscape(x ?? '')).join(','));
	return lines.join('\n');
}

function withTemplate(defaultTemplate: string | null, fallback: string, replacements: Record<string, string>) {
	const template = (defaultTemplate || fallback).trim();
	return template.replace(/\{(\w+)\}/g, (_, key: string) => replacements[key] ?? '');
}

export async function generateMonthlyCsvQueueFile(params: MonthlyGenerationParams) {
	const db = getDb();
	const { year, month, start, next } = parsePeriod(params.period);

	const existing = await db
		.select({ id: utilityBillMonthlyFiles.id, status: utilityBillMonthlyFiles.status })
		.from(utilityBillMonthlyFiles)
		.where(and(eq(utilityBillMonthlyFiles.vendor, params.vendor), eq(utilityBillMonthlyFiles.period, params.period)))
		.limit(1);
	if (existing[0]) {
		throw new Error(`Monthly file already exists for ${params.vendor} ${params.period} (${existing[0].status}).`);
	}

	const docs = await db
		.select()
		.from(utilityBillDocuments)
		.where(
			and(
				eq(utilityBillDocuments.vendor, params.vendor),
				eq(utilityBillDocuments.city, params.city),
				eq(utilityBillDocuments.parseStatus, 'parsed'),
				gte(utilityBillDocuments.dueDate, start),
				lt(utilityBillDocuments.dueDate, next)
			)
		);
	if (docs.length === 0) {
		throw new Error('No parsed documents found for the selected month (based on due date).');
	}

	const queuedItems = await db.select({ documentId: utilityBillMonthlyFileItems.documentId }).from(utilityBillMonthlyFileItems);
	const queuedDocIds = new Set(queuedItems.map((r) => r.documentId));
	const eligibleDocs = docs.filter((d) => !queuedDocIds.has(d.id));
	if (eligibleDocs.length === 0) {
		throw new Error('All parsed documents in that month are already assigned to a monthly queue file.');
	}

	const serviceAccounts = [...new Set(eligibleDocs.map((d) => d.serviceAccountNumber).filter(Boolean) as string[])];
	if (serviceAccounts.length === 0) {
		throw new Error('Parsed documents are missing service account numbers.');
	}

	const mappings = await db
		.select()
		.from(utilityAccountMappings)
		.where(
			and(
				eq(utilityAccountMappings.vendor, params.vendor),
				eq(utilityAccountMappings.city, params.city),
				eq(utilityAccountMappings.active, true),
				inArray(utilityAccountMappings.serviceAccountNumber, serviceAccounts)
			)
		);
	const mapByAccount = new Map(mappings.map((m) => [m.serviceAccountNumber, m]));

	const missing: string[] = [];
	const rows: string[][] = [];
	for (const doc of eligibleDocs) {
		const account = doc.serviceAccountNumber ?? '';
		const mapping = account ? mapByAccount.get(account) : undefined;
		if (!mapping) {
			missing.push(`${doc.sourceFilename}: missing mapping for account ${account || '(none)'}`);
			continue;
		}
		if (!doc.billDate || !doc.dueDate || !doc.currentChargesAmount) {
			missing.push(`${doc.sourceFilename}: missing required parsed fields (billDate/dueDate/currentChargesAmount)`);
			continue;
		}

		const description = withTemplate(
			mapping.defaultDescriptionTemplate,
			'{vendor} utility bill {servicePeriodStart} to {servicePeriodEnd}',
			{
				vendor: params.vendor,
				servicePeriodStart: doc.servicePeriodStart ?? '',
				servicePeriodEnd: doc.servicePeriodEnd ?? ''
			}
		);

		rows.push([
			mapping.billPropertyCode,
			mapping.billUnitName ?? '',
			mapping.vendorPayeeName,
			String(doc.currentChargesAmount),
			mapping.billAccount,
			description,
			doc.billDate,
			doc.dueDate,
			doc.dueDate,
			doc.billReference ?? `${doc.serviceAccountNumber ?? 'unknown'}-${params.period}`,
			'',
			'',
			'',
			mapping.cashAccount ?? ''
		]);
	}

	if (missing.length > 0) {
		throw new Error(`Cannot generate monthly CSV due to mapping/data issues:\n${missing.join('\n')}`);
	}

	const csv = toCsv(APPFOLIO_HEADERS, rows);
	const fileName = `appfolio_vendor_bills_${params.vendor}_${params.period}.csv`;
	const storageKey = buildUtilityBillStorageKey({
		kind: 'output',
		vendor: params.vendor,
		year,
		month,
		fileName
	});

	await putUtilityBillObject({
		key: storageKey,
		body: csv,
		contentType: 'text/csv; charset=utf-8',
		metadata: {
			vendor: params.vendor,
			city: params.city,
			period: params.period
		}
	});

	const inserted = await db
		.insert(utilityBillMonthlyFiles)
		.values({
			vendor: params.vendor,
			city: params.city,
			period: params.period,
			status: 'pending',
			storageKey,
			recordCount: rows.length
		})
		.returning({ id: utilityBillMonthlyFiles.id });

	const monthlyFileId = inserted[0].id;
	await db.insert(utilityBillMonthlyFileItems).values(eligibleDocs.map((d) => ({ monthlyFileId, documentId: d.id })));

	return { id: monthlyFileId, storageKey, recordCount: rows.length };
}

export async function transitionMonthlyCsvStatus(monthlyFileId: string, to: 'processing' | 'done') {
	const db = getDb();
	const rows = await db
		.select({ id: utilityBillMonthlyFiles.id, status: utilityBillMonthlyFiles.status })
		.from(utilityBillMonthlyFiles)
		.where(eq(utilityBillMonthlyFiles.id, monthlyFileId))
		.limit(1);
	const file = rows[0];
	if (!file) throw new Error('Monthly file not found.');

	if (to === 'processing' && file.status !== 'pending') {
		throw new Error('Invalid transition. Only pending files can be marked processing.');
	}
	if (to === 'done' && file.status !== 'processing') {
		throw new Error('Invalid transition. Only processing files can be marked done.');
	}

	await db
		.update(utilityBillMonthlyFiles)
		.set({
			status: to,
			updatedAt: new Date(),
			processedAt: to === 'done' ? new Date() : null
		})
		.where(eq(utilityBillMonthlyFiles.id, monthlyFileId));
}

export async function getMonthlyCsvFile(monthlyFileId: string) {
	const db = getDb();
	const rows = await db
		.select({ id: utilityBillMonthlyFiles.id, storageKey: utilityBillMonthlyFiles.storageKey })
		.from(utilityBillMonthlyFiles)
		.where(eq(utilityBillMonthlyFiles.id, monthlyFileId))
		.limit(1);
	if (!rows[0]) {
		throw new Error('Monthly file not found.');
	}
	const body = await getUtilityBillObject(rows[0].storageKey);
	return { body, storageKey: rows[0].storageKey };
}
