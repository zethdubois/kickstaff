import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { vanityPathForRootHost } from '$lib/vanityHosts';
import {
	SESSION_COOKIE,
	deleteSessionForToken,
	getUserFromSessionToken,
	isPasswordChangeExemptPath
} from '$lib/server/auth';

/**
 * Auth gate: only the **main-host** `/` (ops hub) requires a session.
 * Other paths are not listed here — they stay public unless a route’s own `load` checks `locals`.
 * Vanity domains: `/` maps to a city route without requiring login (see `hooks.ts` reroute).
 */
export const handle: Handle = async ({ event, resolve }) => {
	const vanityTarget = vanityPathForRootHost(event.url.hostname);
	const isRootPath = event.url.pathname === '/' || event.url.pathname === '';
	if (isRootPath && vanityTarget) {
		return resolve(event);
	}

	const sessionToken = event.cookies.get(SESSION_COOKIE);
	let user: Awaited<ReturnType<typeof getUserFromSessionToken>> = null;

	if (sessionToken) {
		try {
			user = await getUserFromSessionToken(sessionToken);
		} catch {
			user = null;
		}
		if (!user) {
			await deleteSessionForToken(sessionToken).catch(() => {});
			event.cookies.delete(SESSION_COOKIE, { path: '/' });
		}
	}

	event.locals.user = user;

	if (user?.mustChangePassword && !isPasswordChangeExemptPath(event.url.pathname)) {
		throw redirect(303, '/account/password');
	}

	if (event.url.pathname === '/' && !vanityTarget && !user) {
		throw redirect(303, '/login');
	}

	return resolve(event);
};
