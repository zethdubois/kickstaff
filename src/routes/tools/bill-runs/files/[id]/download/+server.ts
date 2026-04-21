import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/guards';
import { getMonthlyBatchFile } from '$lib/server/bills/monthlyBatch';

export const GET: RequestHandler = async ({ params, locals }) => {
	requireAdmin(locals.user);
	try {
		const file = await getMonthlyBatchFile(params.id);
		const name = file.storageKey.split('/').at(-1) || 'monthly.csv';
		return new Response(file.body, {
			headers: {
				'content-type': 'text/csv; charset=utf-8',
				'content-disposition': `attachment; filename="${name}"`
			}
		});
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		throw error(404, message);
	}
};
