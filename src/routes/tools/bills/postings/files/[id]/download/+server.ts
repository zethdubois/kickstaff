/**
 * @docs-order
 * 1) /home/golem/projects/publicweb/AGENTS.md
 * 2) /home/golem/projects/publicweb/docs/guides/tools-bills-architecture.md
 * 3) /home/golem/projects/publicweb/docs/guides/tools-bills-ui-map.md
 */
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
