import { and, count, eq, gte, lt, sql } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { billDocuments, billMonthlyFiles } from '$lib/server/schema';

export type MonthlyMetrics = {
	period: string;
	periodStart: Date;
	periodEnd: Date;
	documents: {
		total: number;
		received: number;
		parsed: number;
		failed: number;
		skipped: number;
	};
	postings: {
		total: number;
		pending: number;
		processing: number;
		done: number;
		recordsTotal: number;
	};
};

/** Validate a YYYY-MM period string. Throws on invalid input. */
export function parsePeriod(period: string): { period: string; start: Date; end: Date } {
	if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
		throw new Error(`Invalid period (expected YYYY-MM): ${period}`);
	}
	const [yearStr, monthStr] = period.split('-');
	const year = Number(yearStr);
	const month = Number(monthStr);
	const start = new Date(Date.UTC(year, month - 1, 1));
	const end = new Date(Date.UTC(year, month, 1));
	return { period, start, end };
}

export function currentPeriod(): string {
	const now = new Date();
	return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

export async function loadMonthlyMetrics(period: string): Promise<MonthlyMetrics> {
	const { start, end } = parsePeriod(period);
	const db = getDb();

	const docRows = await db
		.select({
			status: billDocuments.parseStatus,
			n: count()
		})
		.from(billDocuments)
		.where(and(gte(billDocuments.createdAt, start), lt(billDocuments.createdAt, end)))
		.groupBy(billDocuments.parseStatus);

	const docs = { total: 0, received: 0, parsed: 0, failed: 0, skipped: 0 };
	for (const row of docRows) {
		const n = Number(row.n);
		docs.total += n;
		if (row.status === 'received') docs.received = n;
		else if (row.status === 'parsed') docs.parsed = n;
		else if (row.status === 'failed') docs.failed = n;
		else if (row.status === 'skipped') docs.skipped = n;
	}

	const postingRows = await db
		.select({
			status: billMonthlyFiles.status,
			n: count(),
			records: sql<number>`coalesce(sum(${billMonthlyFiles.recordCount}), 0)`
		})
		.from(billMonthlyFiles)
		.where(eq(billMonthlyFiles.period, period))
		.groupBy(billMonthlyFiles.status);

	const postings = { total: 0, pending: 0, processing: 0, done: 0, recordsTotal: 0 };
	for (const row of postingRows) {
		const n = Number(row.n);
		const records = Number(row.records);
		postings.total += n;
		postings.recordsTotal += records;
		if (row.status === 'pending') postings.pending = n;
		else if (row.status === 'processing') postings.processing = n;
		else if (row.status === 'done') postings.done = n;
	}

	return { period, periodStart: start, periodEnd: end, documents: docs, postings };
}
