import type { Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';

const SESSION_COOKIE = 'ka_session';

export const actions: Actions = {
	default: async ({ cookies, request }) => {
		const form = await request.formData();
		const intent = String(form.get('intent') ?? '');
		if (intent !== 'ok') {
			return fail(400, { message: 'Invalid intent' });
		}

		// Dummy login: set a simple cookie so the root dashboard is accessible.
		cookies.set(SESSION_COOKIE, 'dummy', {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: false,
			maxAge: 60 * 60 * 24 * 7
		});

		throw redirect(303, '/');
	}
};

