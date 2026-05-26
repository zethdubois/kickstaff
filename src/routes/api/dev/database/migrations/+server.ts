import { json, type RequestHandler } from '@sveltejs/kit';
import { assertDevDatabaseInspection, buildDatabaseMigrationsPayload } from '$lib/server/devDbHandlers';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ message: 'Unauthorized' }, { status: 401 });
	}
	const guard = assertDevDatabaseInspection();
	if (!guard.ok) {
		return json({ message: guard.message }, { status: guard.status });
	}
	return json(await buildDatabaseMigrationsPayload());
};
