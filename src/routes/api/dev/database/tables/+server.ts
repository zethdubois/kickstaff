import { json, type RequestHandler } from '@sveltejs/kit';
import { assertDevDatabaseInspection, buildDatabaseTablesPayload } from '$lib/server/devDbHandlers';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ message: 'Unauthorized' }, { status: 401 });
	}
	const guard = assertDevDatabaseInspection();
	if (!guard.ok) {
		return json({ message: guard.message }, { status: guard.status });
	}
	try {
		return json(await buildDatabaseTablesPayload());
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Failed to list tables';
		return json({ message }, { status: 500 });
	}
};
