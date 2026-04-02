import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

/** GET /logout — use the sign-out form on the dashboard (POST). */
export const load: PageLoad = () => {
	throw redirect(303, '/login');
};
