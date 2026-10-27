import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { createPasswordResetToken, findUserByEmail } from '$lib/server/auth';
import { getActiveDbTarget, isDbSwitchingEnabled } from '$lib/server/dbTarget';
import { sendPasswordResetLinkEmail } from '$lib/server/mail';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		throw redirect(303, '/');
	}
	return {};
};

export const actions: Actions = {
	default: async ({ request }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '')
			.trim()
			.toLowerCase();

		if (!email) {
			return fail(400, { message: 'Email is required.' });
		}

		// Always the same response — do not reveal whether the account exists.
		const okMessage =
			'If an account exists for that email, a reset link is on its way. Check your inbox.';

		try {
			const user = await findUserByEmail(email);
			if (user) {
				const token = await createPasswordResetToken(user.id);
				await sendPasswordResetLinkEmail(
					user.email,
					token,
					isDbSwitchingEnabled() ? getActiveDbTarget() : undefined
				);
			}
		} catch (e) {
			console.error('[forgot-password]', e);
			return fail(500, { message: 'Could not process that request. Try again later.' });
		}

		return { message: okMessage, ok: true };
	}
};
