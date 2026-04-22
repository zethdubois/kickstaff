import { and, eq, gte, inArray, lt } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import {
	billDocuments,
	billMonthlyFileItems,
	billMonthlyFiles,
	unitBillAccounts,
	units
} from '$lib/server/schema';
import {
	billDocumentColumnsWithoutLinkedUnit,
	supportsBillDocumentLinkedUnit
} from '$lib/server/bills/billDocumentsLinkedUnitSupport';
import { buildBillStorageKey, getBillObject, putBillObject } from '$lib/server/storage';
import {
	APPFOLIO_VENDOR_BILL_HEADERS,
	buildAppfolioVendorBillRow
} from '$lib/server/adapters/appfolio/vendorBill';

type MonthlyGenerationParams = {
	category?: string;
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

function resolveCurrentChargesAmount(
	doc: Pick<typeof billDocuments.$inferSelect, 'currentChargesAmount' | 'rawParseJson'>
) {
	if (doc.currentChargesAmount != null) return String(doc.currentChargesAmount);
	const raw = doc.rawParseJson as Record<string, unknown> | null;
	if (!raw || typeof raw !== 'object') return null;
	const candidates = [
		raw.currentChargesAmount,
		raw.current_charges_amount,
		raw.currentCharges,
		raw.amountDue,
		raw.amount_due
	];
	for (const value of candidates) {
		if (value == null) continue;
		const parsed = Number(String(value).replace(/,/g, '').trim());
		if (!Number.isNaN(parsed)) return parsed.toFixed(2);
	}
	return null;
}

export async function generateMonthlyBatchFile(params: MonthlyGenerationParams) {
	const db = getDb();
	const category = params.category || 'utility';
	const { year, month, start, next } = parsePeriod(params.period);

	const existing = await db
		.select({ id: billMonthlyFiles.id, status: billMonthlyFiles.status })
		.from(billMonthlyFiles)
		.where(and(eq(billMonthlyFiles.vendor, params.vendor), eq(billMonthlyFiles.period, params.period)))
		.limit(1);
	if (existing[0]) {
		throw new Error(`Monthly file already exists for ${params.vendor} ${params.period} (${existing[0].status}).`);
	}

	const linkCol = await supportsBillDocumentLinkedUnit(db);
	const docs = linkCol
		? await db
				.select()
				.from(billDocuments)
				.where(
					and(
						eq(billDocuments.vendor, params.vendor),
						eq(billDocuments.city, params.city),
						eq(billDocuments.parseStatus, 'parsed'),
						gte(billDocuments.dueDate, start),
						lt(billDocuments.dueDate, next)
					)
				)
		: await db
				.select(billDocumentColumnsWithoutLinkedUnit())
				.from(billDocuments)
				.where(
					and(
						eq(billDocuments.vendor, params.vendor),
						eq(billDocuments.city, params.city),
						eq(billDocuments.parseStatus, 'parsed'),
						gte(billDocuments.dueDate, start),
						lt(billDocuments.dueDate, next)
					)
				);
	if (docs.length === 0) {
		throw new Error('No parsed documents found for the selected month (based on due date).');
	}

	const queuedItems = await db
		.select({ documentId: billMonthlyFileItems.documentId })
		.from(billMonthlyFileItems);
	const queuedDocIds = new Set(queuedItems.map((r) => r.documentId));
	const eligibleDocs = docs.filter((d) => !queuedDocIds.has(d.id));
	if (eligibleDocs.length === 0) {
		throw new Error('All parsed documents in that month are already assigned to a monthly queue file.');
	}

	const serviceAccounts = [
		...new Set(eligibleDocs.map((d) => d.serviceAccountNumber).filter(Boolean) as string[])
	];
	if (serviceAccounts.length === 0) {
		throw new Error('Parsed documents are missing service account numbers.');
	}

	const accountRows = await db
		.select({
			account: unitBillAccounts,
			unit: units
		})
		.from(unitBillAccounts)
		.innerJoin(units, eq(unitBillAccounts.unitId, units.id))
		.where(
			and(
				eq(unitBillAccounts.vendor, params.vendor),
				eq(unitBillAccounts.active, true),
				inArray(unitBillAccounts.serviceAccountNumber, serviceAccounts)
			)
		);
	type ResolvedAccount = {
		unit: typeof units.$inferSelect;
		vendorPayeeName: string;
		billAccount: string | null;
		defaultDescriptionTemplate: string | null;
		cashAccount: string | null;
	};
	const mapByAccount = new Map<string, ResolvedAccount>(
		accountRows.map((r) => [
			r.account.serviceAccountNumber,
			{
				unit: r.unit,
				vendorPayeeName: r.account.vendorPayeeName,
				billAccount: r.account.billAccount,
				defaultDescriptionTemplate: r.account.defaultDescriptionTemplate,
				cashAccount: r.account.cashAccount
			}
		])
	);
	const directUnits = await db
		.select({ unit: units })
		.from(units)
		.where(and(eq(units.active, true), inArray(units.utilityAccountNumber, serviceAccounts)));
	for (const row of directUnits) {
		const accountNum = row.unit.utilityAccountNumber;
		if (!accountNum || mapByAccount.has(accountNum)) continue;
		mapByAccount.set(accountNum, {
			unit: row.unit,
			vendorPayeeName: params.vendor,
			billAccount: null,
			defaultDescriptionTemplate: null,
			cashAccount: null
		});
	}

	const missing: string[] = [];
	const rows: string[][] = [];
	for (const doc of eligibleDocs) {
		const accountNum = doc.serviceAccountNumber ?? '';
		const match = accountNum ? mapByAccount.get(accountNum) : undefined;
		if (!match) {
			missing.push(`${doc.sourceFilename}: no unit linked to account ${accountNum || '(none)'}`);
			continue;
		}
		const dueDate = doc.dueDate;
		const billDate = doc.billDate ?? dueDate;
		const currentChargesAmount = resolveCurrentChargesAmount(doc);
		if (!dueDate || !billDate || !currentChargesAmount) {
			const missingFields = [
				!billDate ? 'billDate' : null,
				!dueDate ? 'dueDate' : null,
				!currentChargesAmount ? 'currentChargesAmount' : null
			]
				.filter(Boolean)
				.join('/');
			missing.push(`${doc.sourceFilename}: missing required parsed fields (${missingFields})`);
			continue;
		}

		const { unit } = match;
		if (!match.billAccount) {
			missing.push(`${doc.sourceFilename}: unit ${unit.label} needs bill account details`);
			continue;
		}
		const description = withTemplate(
			match.defaultDescriptionTemplate,
			'{vendor} bill {servicePeriodStart} to {servicePeriodEnd}',
			{
				vendor: params.vendor,
				servicePeriodStart: doc.servicePeriodStart ?? '',
				servicePeriodEnd: doc.servicePeriodEnd ?? ''
			}
		);

		rows.push(
			buildAppfolioVendorBillRow({
				unit,
				vendorPayeeName: match.vendorPayeeName,
				billAccount: match.billAccount,
				description,
				cashAccount: match.cashAccount,
				doc,
				currentChargesAmount,
				billDate,
				dueDate,
				period: params.period
			})
		);
	}

	if (missing.length > 0) {
		throw new Error(`Cannot generate monthly batch due to unit/data issues:\n${missing.join('\n')}`);
	}

	const csv = toCsv(APPFOLIO_VENDOR_BILL_HEADERS, rows);
	const fileName = `appfolio_vendor_bills_${params.vendor}_${params.period}.csv`;
	const storageKey = buildBillStorageKey({
		kind: 'output',
		category,
		vendor: params.vendor,
		year,
		month,
		fileName
	});

	await putBillObject({
		key: storageKey,
		body: csv,
		contentType: 'text/csv; charset=utf-8',
		metadata: {
			category,
			vendor: params.vendor,
			city: params.city,
			period: params.period
		}
	});

	const inserted = await db
		.insert(billMonthlyFiles)
		.values({
			vendor: params.vendor,
			city: params.city,
			period: params.period,
			status: 'pending',
			storageKey,
			recordCount: rows.length
		})
		.returning({ id: billMonthlyFiles.id });

	const monthlyFileId = inserted[0].id;
	await db
		.insert(billMonthlyFileItems)
		.values(eligibleDocs.map((d) => ({ monthlyFileId, documentId: d.id })));

	return { id: monthlyFileId, storageKey, recordCount: rows.length };
}

export async function transitionMonthlyBatchStatus(monthlyFileId: string, to: 'processing' | 'done') {
	const db = getDb();
	const rows = await db
		.select({ id: billMonthlyFiles.id, status: billMonthlyFiles.status })
		.from(billMonthlyFiles)
		.where(eq(billMonthlyFiles.id, monthlyFileId))
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
		.update(billMonthlyFiles)
		.set({
			status: to,
			updatedAt: new Date(),
			processedAt: to === 'done' ? new Date() : null
		})
		.where(eq(billMonthlyFiles.id, monthlyFileId));
}

export async function getMonthlyBatchFile(monthlyFileId: string) {
	const db = getDb();
	const rows = await db
		.select({ id: billMonthlyFiles.id, storageKey: billMonthlyFiles.storageKey })
		.from(billMonthlyFiles)
		.where(eq(billMonthlyFiles.id, monthlyFileId))
		.limit(1);
	if (!rows[0]) {
		throw new Error('Monthly file not found.');
	}
	const body = await getBillObject(rows[0].storageKey);
	return { body, storageKey: rows[0].storageKey };
}
