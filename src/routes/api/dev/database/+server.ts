import { json, type RequestHandler } from '@sveltejs/kit';
import { buildDatabaseStatusPayload } from '$lib/server/devDbHandlers';
import { DB_TARGET_COOKIE, isDbSwitchingEnabled, setActiveDbTarget, type DbTarget } from '$lib/server/dbTarget';
import { isSuperUser } from '$lib/server/superUser';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ message: 'Unauthorized' }, { status: 401 });
	}
	const canSwitch = isDbSwitchingEnabled() && isSuperUser(locals.user);
	return json(await buildDatabaseStatusPayload(canSwitch));
};

export const POST: RequestHandler = async ({ request, locals, cookies, url }) => {
	if (!locals.user) {
		return json({ message: 'Unauthorized' }, { status: 401 });
	}
	if (!isDbSwitchingEnabled()) {
		return json({ message: 'Database switching is disabled' }, { status: 403 });
	}
	if (!isSuperUser(locals.user)) {
		return json({ message: 'Super user only' }, { status: 403 });
	}

	let body: { target?: string };
	try {
		body = await request.json();
	} catch {
		return json({ message: 'Invalid JSON body' }, { status: 400 });
	}

	const target = body.target;
	if (target !== 'dev' && target !== 'prod') {
		return json({ message: 'target must be "dev" or "prod"' }, { status: 400 });
	}

	try {
		await setActiveDbTarget(target as DbTarget);
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Failed to switch database';
		return json({ message }, { status: 400 });
	}

	cookies.set(DB_TARGET_COOKIE, target, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: url.protocol === 'https:',
		maxAge: 60 * 60 * 24 * 365
	});

	return json(await buildDatabaseStatusPayload(true));
};
