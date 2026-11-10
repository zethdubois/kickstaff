/**
 * Klio action rows in the product database. Confirm runs the stored calls.
 * The browser posts a plan id. It does not post a command list.
 */
import { and, desc, eq } from 'drizzle-orm';
import type { CommandOutcome } from '$lib/kickagent/contracts';
import type { KlioActionCard, KlioPlanCall } from '$lib/klio/plan';
import { getDb } from '$lib/server/db';
import type { DbTarget } from '$lib/server/dbTarget';
import { runKickagentCatalogCommandViaApi } from '$lib/server/kickagentRemoteRun';
import { resolveOpsDatabase } from '$lib/server/opsDatasets';
import { klioPlans, type KlioPlanRow } from '$lib/server/schema';

type Owner = { id: string; email: string; role: string };

export type KlioSavedPlan = { id: string; title: string; proposedAt: number };

export type KlioActionContext = {
	pending: KlioActionCard | null;
	latestExecuted: {
		id: string;
		title: string;
		results: unknown[] | null;
		executedAt: number | null;
	} | null;
};

function toCard(row: KlioPlanRow): KlioActionCard {
	return {
		id: row.id,
		title: row.title,
		summary: row.summary,
		calls: row.calls,
		proposedAt: row.proposedAt.getTime(),
		status: row.status === 'executed' ? 'executed' : 'pending',
		executedAt: row.executedAt ? row.executedAt.getTime() : null,
		results: row.results ?? null
	};
}

async function findOwned(userId: string, datasetName: string, planId: string) {
	const db = getDb();
	const [row] = await db
		.select()
		.from(klioPlans)
		.where(
			and(
				eq(klioPlans.id, planId),
				eq(klioPlans.userId, userId),
				eq(klioPlans.datasetName, datasetName)
			)
		)
		.limit(1);
	return row ?? null;
}

/** Insert a proposal. The previous pending row becomes saved. */
export async function proposePlan(
	userId: string,
	datasetName: string,
	draft: { title: string; summary: string; calls: KlioPlanCall[] }
): Promise<KlioActionCard> {
	const db = getDb();
	const row = await db.transaction(async (tx) => {
		await tx
			.update(klioPlans)
			.set({ status: 'saved' })
			.where(
				and(
					eq(klioPlans.userId, userId),
					eq(klioPlans.datasetName, datasetName),
					eq(klioPlans.status, 'pending')
				)
			);
		const [inserted] = await tx
			.insert(klioPlans)
			.values({
				userId,
				datasetName,
				title: draft.title,
				summary: draft.summary,
				calls: draft.calls,
				status: 'pending'
			})
			.returning();
		return inserted;
	});
	return toCard(row);
}

export async function findPendingPlan(
	userId: string,
	datasetName: string
): Promise<KlioActionCard | null> {
	const db = getDb();
	const [row] = await db
		.select()
		.from(klioPlans)
		.where(
			and(
				eq(klioPlans.userId, userId),
				eq(klioPlans.datasetName, datasetName),
				eq(klioPlans.status, 'pending')
			)
		)
		.limit(1);
	return row ? toCard(row) : null;
}

export async function listSavedPlans(userId: string, datasetName: string): Promise<KlioSavedPlan[]> {
	const db = getDb();
	const rows = await db
		.select({
			id: klioPlans.id,
			title: klioPlans.title,
			proposedAt: klioPlans.proposedAt
		})
		.from(klioPlans)
		.where(
			and(
				eq(klioPlans.userId, userId),
				eq(klioPlans.datasetName, datasetName),
				eq(klioPlans.status, 'saved')
			)
		)
		.orderBy(desc(klioPlans.proposedAt));
	return rows.map((row) => ({
		id: row.id,
		title: row.title,
		proposedAt: row.proposedAt.getTime()
	}));
}

/** What the next ask tells her. Pending, or none, and the latest executed logs. */
export async function actionContext(userId: string, datasetName: string): Promise<KlioActionContext> {
	const db = getDb();
	const pending = await findPendingPlan(userId, datasetName);
	const [executed] = await db
		.select()
		.from(klioPlans)
		.where(
			and(
				eq(klioPlans.userId, userId),
				eq(klioPlans.datasetName, datasetName),
				eq(klioPlans.status, 'executed')
			)
		)
		.orderBy(desc(klioPlans.executedAt))
		.limit(1);
	return {
		pending,
		latestExecuted: executed
			? {
					id: executed.id,
					title: executed.title,
					results: executed.results ?? null,
					executedAt: executed.executedAt ? executed.executedAt.getTime() : null
				}
			: null
	};
}

export async function savePlan(
	userId: string,
	datasetName: string,
	planId: string
): Promise<boolean> {
	const db = getDb();
	const rows = await db
		.update(klioPlans)
		.set({ status: 'saved' })
		.where(
			and(
				eq(klioPlans.id, planId),
				eq(klioPlans.userId, userId),
				eq(klioPlans.datasetName, datasetName),
				eq(klioPlans.status, 'pending')
			)
		)
		.returning({ id: klioPlans.id });
	return rows.length > 0;
}

export async function cancelPlan(
	userId: string,
	datasetName: string,
	planId: string
): Promise<boolean> {
	const db = getDb();
	const rows = await db
		.update(klioPlans)
		.set({ status: 'cancelled' })
		.where(
			and(
				eq(klioPlans.id, planId),
				eq(klioPlans.userId, userId),
				eq(klioPlans.datasetName, datasetName),
				eq(klioPlans.status, 'pending')
			)
		)
		.returning({ id: klioPlans.id });
	return rows.length > 0;
}

/** Take a saved row off the chats list. The audit row stays, as cancelled. */
export async function dismissSavedPlan(
	userId: string,
	datasetName: string,
	planId: string
): Promise<boolean> {
	const db = getDb();
	const rows = await db
		.update(klioPlans)
		.set({ status: 'cancelled' })
		.where(
			and(
				eq(klioPlans.id, planId),
				eq(klioPlans.userId, userId),
				eq(klioPlans.datasetName, datasetName),
				eq(klioPlans.status, 'saved')
			)
		)
		.returning({ id: klioPlans.id });
	return rows.length > 0;
}

/** Make a saved row the pending card. Any other pending row is saved first. */
export async function openSavedPlan(
	userId: string,
	datasetName: string,
	planId: string
): Promise<KlioActionCard | null> {
	const target = await findOwned(userId, datasetName, planId);
	if (!target || target.status !== 'saved') return null;
	const db = getDb();
	const row = await db.transaction(async (tx) => {
		await tx
			.update(klioPlans)
			.set({ status: 'saved' })
			.where(
				and(
					eq(klioPlans.userId, userId),
					eq(klioPlans.datasetName, datasetName),
					eq(klioPlans.status, 'pending')
				)
			);
		const [opened] = await tx
			.update(klioPlans)
			.set({ status: 'pending' })
			.where(and(eq(klioPlans.id, target.id), eq(klioPlans.status, 'saved')))
			.returning();
		return opened ?? null;
	});
	return row ? toCard(row) : null;
}

/**
 * Claim the pending row, run its calls in order, and store one log per call.
 * A failed call stops the sequence. The row is executed either way, so Confirm
 * cannot run the same calls twice.
 */
export async function confirmPlan(
	user: Owner,
	datasetName: DbTarget,
	planId: string
): Promise<{ plan: KlioActionCard } | { message: string }> {
	const pending = await findOwned(user.id, datasetName, planId);
	if (!pending || pending.status !== 'pending') {
		return { message: 'That plan is no longer pending.' };
	}
	let opsDatabase;
	try {
		opsDatabase = await resolveOpsDatabase({ user, datasetName });
	} catch (err) {
		return { message: err instanceof Error ? err.message : 'Ops database is not available.' };
	}

	const db = getDb();
	const claimed = await db
		.update(klioPlans)
		.set({ status: 'executed', executedAt: new Date(), results: [] })
		.where(
			and(
				eq(klioPlans.id, planId),
				eq(klioPlans.userId, user.id),
				eq(klioPlans.datasetName, datasetName),
				eq(klioPlans.status, 'pending')
			)
		)
		.returning();
	const row = claimed[0];
	if (!row) return { message: 'That plan is no longer pending.' };

	const results: CommandOutcome[] = [];
	for (const call of row.calls) {
		try {
			results.push(
				await runKickagentCatalogCommandViaApi({
					command: call.command,
					args: call.args,
					userId: user.id,
					userEmail: user.email,
					db: datasetName,
					opsDatabase
				})
			);
		} catch (err) {
			results.push({
				level: 'error',
				log: err instanceof Error ? err.message : 'Command failed.'
			});
			break;
		}
	}

	const [done] = await db
		.update(klioPlans)
		.set({ results })
		.where(eq(klioPlans.id, row.id))
		.returning();
	return { plan: toCard(done ?? { ...row, results }) };
}
