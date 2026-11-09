/**
 * Klio threads in the product database. One open conversation per user and
 * active dataset. The ops database is not involved.
 */
import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { klioConversations, klioLines } from '$lib/server/schema';

export type StoredKlioLine = {
	id: string;
	role: 'user' | 'klio';
	text: string;
	ts: number;
};

function asRole(role: string): 'user' | 'klio' {
	return role === 'user' ? 'user' : 'klio';
}

export async function findOpenConversation(userId: string, datasetName: string) {
	const db = getDb();
	const [row] = await db
		.select()
		.from(klioConversations)
		.where(
			and(
				eq(klioConversations.userId, userId),
				eq(klioConversations.datasetName, datasetName),
				isNull(klioConversations.closedAt)
			)
		)
		.limit(1);
	return row ?? null;
}

export async function openConversation(userId: string, datasetName: string) {
	const existing = await findOpenConversation(userId, datasetName);
	if (existing) return existing;
	const db = getDb();
	try {
		const [row] = await db
			.insert(klioConversations)
			.values({ userId, datasetName })
			.returning();
		return row;
	} catch {
		const again = await findOpenConversation(userId, datasetName);
		if (again) return again;
		throw new Error('Could not open a Klio conversation');
	}
}

export async function listLines(conversationId: string): Promise<StoredKlioLine[]> {
	const db = getDb();
	const rows = await db
		.select()
		.from(klioLines)
		.where(eq(klioLines.conversationId, conversationId))
		.orderBy(asc(klioLines.ts), asc(klioLines.id));
	return rows.map((row) => ({
		id: row.id,
		role: asRole(row.role),
		text: row.text,
		ts: row.ts.getTime()
	}));
}

export async function appendLine(
	conversationId: string,
	role: 'user' | 'klio',
	text: string,
	ts = new Date()
): Promise<void> {
	const db = getDb();
	await db.insert(klioLines).values({
		conversationId,
		role,
		text,
		ts
	});
}

export type KlioChatSummary = {
	id: string;
	title: string;
	createdAt: number;
	open: boolean;
};

function chatTitle(text: string | undefined, createdAt: Date): string {
	const trimmed = text?.trim().replace(/\s+/g, ' ') ?? '';
	if (!trimmed) return createdAt.toLocaleString();
	return trimmed.length > 72 ? `${trimmed.slice(0, 69)}…` : trimmed;
}

/** Saved threads for this user and dataset. Empty threads are omitted. */
export async function listChats(userId: string, datasetName: string): Promise<KlioChatSummary[]> {
	const db = getDb();
	const conversations = await db
		.select()
		.from(klioConversations)
		.where(
			and(eq(klioConversations.userId, userId), eq(klioConversations.datasetName, datasetName))
		)
		.orderBy(desc(klioConversations.createdAt));
	if (conversations.length === 0) return [];
	const ids = conversations.map((row) => row.id);
	const userLines = await db
		.select()
		.from(klioLines)
		.where(and(inArray(klioLines.conversationId, ids), eq(klioLines.role, 'user')))
		.orderBy(asc(klioLines.ts), asc(klioLines.id));
	const firstUser = new Map<string, string>();
	for (const line of userLines) {
		if (!firstUser.has(line.conversationId)) firstUser.set(line.conversationId, line.text);
	}
	return conversations
		.filter((row) => firstUser.has(row.id))
		.map((row) => ({
			id: row.id,
			title: chatTitle(firstUser.get(row.id), row.createdAt),
			createdAt: row.createdAt.getTime(),
			open: row.closedAt == null
		}));
}

/** Make this thread the open one and return its lines. Null when it is not theirs. */
export async function activateConversation(
	userId: string,
	datasetName: string,
	conversationId: string
): Promise<StoredKlioLine[] | null> {
	const db = getDb();
	const [target] = await db
		.select()
		.from(klioConversations)
		.where(
			and(
				eq(klioConversations.id, conversationId),
				eq(klioConversations.userId, userId),
				eq(klioConversations.datasetName, datasetName)
			)
		)
		.limit(1);
	if (!target) return null;
	if (target.closedAt) {
		await db
			.update(klioConversations)
			.set({ closedAt: new Date() })
			.where(
				and(
					eq(klioConversations.userId, userId),
					eq(klioConversations.datasetName, datasetName),
					isNull(klioConversations.closedAt)
				)
			);
		await db
			.update(klioConversations)
			.set({ closedAt: null })
			.where(eq(klioConversations.id, target.id));
	}
	return listLines(target.id);
}

export async function deleteConversation(
	userId: string,
	datasetName: string,
	conversationId: string
): Promise<{ deleted: boolean; wasOpen: boolean }> {
	const db = getDb();
	const [target] = await db
		.select({ id: klioConversations.id, closedAt: klioConversations.closedAt })
		.from(klioConversations)
		.where(
			and(
				eq(klioConversations.id, conversationId),
				eq(klioConversations.userId, userId),
				eq(klioConversations.datasetName, datasetName)
			)
		)
		.limit(1);
	if (!target) return { deleted: false, wasOpen: false };
	await db.delete(klioConversations).where(eq(klioConversations.id, target.id));
	return { deleted: true, wasOpen: target.closedAt == null };
}

/** Close the open thread (if any) and start an empty one. */
export async function startNewConversation(userId: string, datasetName: string) {
	const db = getDb();
	await db
		.update(klioConversations)
		.set({ closedAt: new Date() })
		.where(
			and(
				eq(klioConversations.userId, userId),
				eq(klioConversations.datasetName, datasetName),
				isNull(klioConversations.closedAt)
			)
		);
	return openConversation(userId, datasetName);
}
