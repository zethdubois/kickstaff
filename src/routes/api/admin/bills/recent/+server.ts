import { desc } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { billDocuments } from '$lib/server/schema';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user || locals.user.role !== 'admin') {
		return json({ message: 'Unauthorized' }, { status: 401 });
	}

	const db = getDb();
	const docs = await db.select().from(billDocuments).orderBy(desc(billDocuments.createdAt)).limit(100);
	return json({ docs });
};
