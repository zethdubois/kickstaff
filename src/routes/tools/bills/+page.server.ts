import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { desc, eq } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { requireAdmin } from '$lib/server/guards';
import { billCategories, billDocuments } from '$lib/server/schema';
import { ingestBillPdf } from '$lib/server/bills/intake';
import { parseBillDocumentById } from '$lib/server/bills/parseDocument';

export const load: PageServerLoad = async ({ locals }) => {
	requireAdmin(locals.user);
	const db = getDb();
	const docs = await db
		.select()
		.from(billDocuments)
		.orderBy(desc(billDocuments.createdAt))
		.limit(100);
	return { docs, categories: billCategories };
};

export const actions: Actions = {
	upload: async ({ request, locals }) => {
		requireAdmin(locals.user);
		const form = await request.formData();
		const category = String(form.get('category') ?? 'utility').trim() || 'utility';
		const vendor = String(form.get('vendor') ?? '').trim();
		const city = String(form.get('city') ?? '').trim();
		const file = form.get('pdf');

		if (!vendor) return fail(400, { message: 'Vendor is required.' });
		if (!city) return fail(400, { message: 'City is required.' });
		if (!(file instanceof File)) return fail(400, { message: 'Please select a PDF file.' });
		if (!file.name.toLowerCase().endsWith('.pdf'))
			return fail(400, { message: 'Only PDF uploads are supported.' });

		let res:
			| { status: 'duplicate_skipped'; id: string; sha256: string }
			| { status: 'ingested'; id: string; sha256: string; storageKey: string };
		try {
			const bytes = await file.arrayBuffer();
			res = await ingestBillPdf({
				pdfBuffer: Buffer.from(bytes),
				fileName: file.name,
				category,
				vendor,
				city
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			if (message.includes('Bill storage env is missing')) {
				return fail(400, {
					message:
						'Bill storage is not configured. Set UTILITY_BILL_S3_ENDPOINT, UTILITY_BILL_S3_ACCESS_KEY_ID, UTILITY_BILL_S3_SECRET_ACCESS_KEY, and UTILITY_BILL_S3_BUCKET in server env.'
				});
			}
			console.error('Bill upload failed', error);
			return fail(500, { message: 'Upload failed. Check server logs and storage configuration.' });
		}

		if (res.status === 'duplicate_skipped') {
			return { duplicate: true as const, id: res.id };
		}
		return { uploaded: true as const, id: res.id };
	},
	parse: async ({ request, locals }) => {
		requireAdmin(locals.user);
		const form = await request.formData();
		const id = String(form.get('id') ?? '').trim();
		if (!id) {
			return fail(400, { message: 'Document ID is required.' });
		}

		const db = getDb();
		const row = await db
			.select({ id: billDocuments.id })
			.from(billDocuments)
			.where(eq(billDocuments.id, id))
			.limit(1);
		if (!row[0]) {
			return fail(404, { message: 'Document not found.' });
		}

		let result: Awaited<ReturnType<typeof parseBillDocumentById>>;
		try {
			result = await parseBillDocumentById(id);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			console.error('Bill parse failed', error);
			return fail(500, { message: `Parse failed: ${message}` });
		}
		if (result.status === 'failed') {
			return fail(400, { message: `Parse failed: ${result.error}` });
		}
		return { parsed: true as const, id };
	}
};
