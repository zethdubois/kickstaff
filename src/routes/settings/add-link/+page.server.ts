import type { Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { createDashboardLinkFromForm } from '$lib/server/dashboardLinksMutations';
import { requireUser } from '$lib/server/guards';

export const actions: Actions = {
	create: async ({ request, locals }) => {
		requireUser(locals.user);
		const form = await request.formData();
		const result = await createDashboardLinkFromForm(form);
		if (!result.ok) return fail(result.status, { message: result.message });
		throw redirect(303, '/settings/dashboard');
	}
};
