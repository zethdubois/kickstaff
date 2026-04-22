import { json } from '@sveltejs/kit';
import { desc, eq, lt, sql } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { isSchemaMismatchError, messageForDbError } from '$lib/server/dbErrors';
import { klogLevels, klogs, type KlogLevel } from '$lib/server/schema';

type IncomingEntry = {
	ts?: unknown;
	level?: unknown;
	message?: unknown;
	source?: unknown;
};

function normalizeLevel(value: unknown): KlogLevel {
	const s = typeof value === 'string' ? value : 'log';
	return (klogLevels as readonly string[]).includes(s) ? (s as KlogLevel) : 'log';
}

function normalizeTs(value: unknown): Date {
	if (typeof value === 'number' && Number.isFinite(value)) return new Date(value);
	if (typeof value === 'string') {
		const d = new Date(value);
		if (!Number.isNaN(d.getTime())) return d;
	}
	return new Date();
}

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user || locals.user.role !== 'admin') {
		return json({ message: 'Unauthorized' }, { status: 401 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ message: 'Invalid JSON' }, { status: 400 });
	}
	if (!body || typeof body !== 'object') {
		return json({ message: 'Invalid body' }, { status: 400 });
	}

	const entriesRaw = (body as { entries?: unknown }).entries;
	if (!Array.isArray(entriesRaw) || entriesRaw.length === 0) {
		return json({ message: 'entries array required' }, { status: 400 });
	}

	const rows = entriesRaw
		.filter((e): e is IncomingEntry => !!e && typeof e === 'object')
		.map((e) => {
			const message = typeof e.message === 'string' ? e.message : String(e.message ?? '');
			if (!message) return null;
			const source = typeof e.source === 'string' && e.source ? e.source : null;
			return {
				userId: locals.user!.id,
				ts: normalizeTs(e.ts),
				level: normalizeLevel(e.level),
				message,
				source
			};
		})
		.filter((r): r is NonNullable<typeof r> => r !== null);

	if (rows.length === 0) {
		return json({ message: 'no valid entries' }, { status: 400 });
	}

	const db = getDb();
	try {
		await db.insert(klogs).values(rows);

		try {
			await db.delete(klogs).where(lt(klogs.ts, sql`now() - interval '30 days'`));
		} catch {
			/* best-effort prune; ignore failures */
		}

		return json({ ok: true as const, inserted: rows.length });
	} catch (err) {
		if (isSchemaMismatchError(err)) {
			return json({ ok: true as const, inserted: 0, persistent: false as const });
		}
		throw err;
	}
};

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user || locals.user.role !== 'admin') {
		return json({ message: 'Unauthorized' }, { status: 401 });
	}

	const requested = Number(url.searchParams.get('limit') ?? '200');
	const limit = Math.min(500, Math.max(1, Number.isFinite(requested) ? requested : 200));

	const db = getDb();
	try {
		const recent = await db
			.select({
				id: klogs.id,
				ts: klogs.ts,
				level: klogs.level,
				message: klogs.message,
				source: klogs.source
			})
			.from(klogs)
			.where(eq(klogs.userId, locals.user.id))
			.orderBy(desc(klogs.ts))
			.limit(limit);

		const entries = recent
			.map((r) => ({
				id: r.id,
				ts: r.ts instanceof Date ? r.ts.getTime() : new Date(r.ts).getTime(),
				level: (klogLevels as readonly string[]).includes(r.level) ? (r.level as KlogLevel) : 'log',
				message: r.message,
				source: r.source
			}))
			.sort((a, b) => a.ts - b.ts);

		return json({ entries });
	} catch (err) {
		if (isSchemaMismatchError(err)) {
			return json({
				entries: [] as { id: string; ts: number; level: KlogLevel; message: string; source: string | null }[],
				warning: messageForDbError(err)
			});
		}
		const detail = err instanceof Error ? err.message : String(err);
		console.error('[GET /api/klogs]', detail, err);
		const hint = messageForDbError(err);
		return json({ message: hint ?? detail, entries: [] }, { status: 500 });
	}
};
