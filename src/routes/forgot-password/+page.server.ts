import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { createPasswordResetToken, findUserByEmail } from '$lib/server/auth';
import { getActiveDbTarget, isDbSwitchingEnabled } from '$lib/server/dbTarget';
import { sendPasswordResetLinkEmail } from '$lib/server/mail';
import { isProductionRuntime } from '$lib/server/runtimeEnv';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		throw redirect(303, '/');
	}
	return {};
};

export const actions: Actions = {
	default: async ({ request, url }) => {
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
				const { sent, resetUrl, skipped } = await sendPasswordResetLinkEmail(
					user.email,
					token,
					isDbSwitchingEnabled() ? getActiveDbTarget() : undefined,
					url.origin
				);
				if (!sent && !isProductionRuntime()) {
					return {
						ok: true,
						message: skipped
							? 'Mail is logged only in this environment. This dev-only link expires in 1 hour:'
							: 'Mail was not sent (SMTP login rejected). This dev-only link expires in 1 hour:',
						devResetUrl: resetUrl
					};
				}
			}
		} catch (e) {
			console.error('[forgot-password]', e);
			return fail(500, { message: 'Could not process that request. Try again later.' });
		}

		return { message: okMessage, ok: true };
	}
};
