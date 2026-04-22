import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { loadBillDocumentsForAdmin } from '$lib/server/bills/billDocumentsLinkedUnitSupport';
import { getDb } from '$lib/server/db';
import { messageForDbError } from '$lib/server/dbErrors';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user || locals.user.role !== 'admin') {
		return json({ message: 'Unauthorized' }, { status: 401 });
	}

	const db = getDb();
	try {
		const docs = await loadBillDocumentsForAdmin(db, 100);
		return json({ docs });
	} catch (e) {
		const hint = messageForDbError(e);
		console.error('[GET /api/admin/bills/recent]', e);
		if (hint) {
			return json({ message: hint, docs: [] }, { status: 503 });
		}
		throw e;
	}
};
