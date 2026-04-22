import { and, eq } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supportsBillDocumentLinkedUnit } from '$lib/server/bills/billDocumentsLinkedUnitSupport';
import { getDb } from '$lib/server/db';
import { billDocuments } from '$lib/server/schema';

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

	const o = body as Record<string, unknown>;
	const vendor = String(o.vendor ?? '').trim();
	const allParsed = Boolean(o.allParsed);
	if (!allParsed && !vendor) {
		return json({ message: 'vendor is required unless allParsed=true' }, { status: 400 });
	}

	const db = getDb();
	const linkCol = await supportsBillDocumentLinkedUnit(db);
	const result = await db
		.update(billDocuments)
		.set({
			parseStatus: 'received',
			parseError: null,
			serviceAccountNumber: null,
			billReference: null,
			billDate: null,
			dueDate: null,
			servicePeriodStart: null,
			servicePeriodEnd: null,
			currentChargesAmount: null,
			rawParseJson: null,
			...(linkCol ? { linkedUnitId: null } : {}),
			updatedAt: new Date()
		})
		.where(
			allParsed
				? eq(billDocuments.parseStatus, 'parsed')
				: and(eq(billDocuments.vendor, vendor), eq(billDocuments.parseStatus, 'parsed'))
		)
		.returning({ id: billDocuments.id });

	return json({
		ok: true as const,
		allParsed,
		vendor,
		updatedCount: result.length
	});
};
