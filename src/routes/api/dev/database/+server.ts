import { json, type RequestHandler } from '@sveltejs/kit';
import { buildDatabaseStatusPayload } from '$lib/server/devDbHandlers';
import { hasValidSessionForTarget } from '$lib/server/auth';
import {
	isDbSwitchingEnabled,
	isDbTargetAvailable,
	parseDbTarget,
	runWithDbTarget,
	setDbTargetCookie
} from '$lib/server/dbTarget';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ message: 'Unauthorized' }, { status: 401 });
	}
	return json(await buildDatabaseStatusPayload(isDbSwitchingEnabled()));
};

/**
 * Point this browser at another database (local dev only).
 *
 * This is not a privilege escalation: it only changes the preference cookie. Every database
 * has its own sessions, so you can only *use* the target if you hold (or obtain by logging in)
 * a valid session in THAT database. The response says which.
 */
export const POST: RequestHandler = async ({ request, locals, cookies, url }) => {
	if (!locals.user) {
		return json({ message: 'Unauthorized' }, { status: 401 });
	}
	if (!isDbSwitchingEnabled()) {
		return json({ message: 'Database switching is disabled' }, { status: 403 });
	}

	let body: { target?: string };
	try {
		body = await request.json();
	} catch {
		return json({ message: 'Invalid JSON body' }, { status: 400 });
	}

	const target = parseDbTarget(body.target?.trim().toLowerCase());
	if (!target) {
		return json({ message: 'target must be "dev", "staging", or "prod"' }, { status: 400 });
	}
	if (!isDbTargetAvailable(target)) {
		return json(
			{ message: `${target} is not configured on this server (its DATABASE_URL_* is not set)` },
			{ status: 400 }
		);
	}

	setDbTargetCookie(cookies, url, target);

	const hasSession = await hasValidSessionForTarget(target, cookies);
	const status = await runWithDbTarget(target, () => buildDatabaseStatusPayload(true));

	return json({
		...status,
		hasSession,
		loginUrl: `/login?db=${target}`
	});
};
