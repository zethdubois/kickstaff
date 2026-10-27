import type { Actions } from './$types';
import { redirect } from '@sveltejs/kit';
import { signOutOfAllTargets, signOutOfTarget } from '$lib/server/auth';
import { getActiveDbTarget, isDbSwitchingEnabled } from '$lib/server/dbTarget';

export const actions: Actions = {
	/**
	 * Default: sign out of the database you're currently on (other databases' sessions stay).
	 * `all=1`: sign out of every database this browser holds a session for.
	 */
	default: async ({ cookies, request }) => {
		const form = await request.formData();
		if (form.get('all') === '1') {
			await signOutOfAllTargets(cookies);
		} else {
			await signOutOfTarget(getActiveDbTarget(), cookies);
		}
		const to = isDbSwitchingEnabled() ? `/login?db=${getActiveDbTarget()}` : '/login';
		throw redirect(303, to);
	}
};
