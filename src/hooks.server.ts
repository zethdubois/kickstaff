import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { vanityPathForRootHost } from '$lib/vanityHosts';

const SESSION_COOKIE = 'ka_session';

export const handle: Handle = async ({ event, resolve }) => {
	// Preserve the existing "vanity host shows city at /" behavior.
	const vanityTarget = vanityPathForRootHost(event.url.hostname);
	const isRootPath = event.url.pathname === '/' || event.url.pathname === '';
	if (isRootPath && vanityTarget) {
		return resolve(event);
	}

	// Internal ops dashboard is the root homepage.
	// For now, gate it behind a dummy login cookie.
	if (event.url.pathname === '/' && !event.cookies.get(SESSION_COOKIE)) {
		throw redirect(303, '/login');
	}

	return resolve(event);
};

