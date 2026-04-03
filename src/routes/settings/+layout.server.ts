import type { LayoutServerLoad } from './$types';
import { requireUser } from '$lib/server/guards';

export const load: LayoutServerLoad = async ({ locals }) => {
	requireUser(locals.user);
	return {};
};
