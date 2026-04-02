import type { Actions } from './$types';
import { redirect } from '@sveltejs/kit';
import { SESSION_COOKIE, deleteSessionForToken } from '$lib/server/auth';

export const actions: Actions = {
	default: async ({ cookies }) => {
		const token = cookies.get(SESSION_COOKIE);
		await deleteSessionForToken(token);
		cookies.delete(SESSION_COOKIE, { path: '/' });
		throw redirect(303, '/login');
	}
};
