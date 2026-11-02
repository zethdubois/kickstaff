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
				await sendPasswordResetLinkEmail(
					user.email,
					token,
					isDbSwitchingEnabled() ? getActiveDbTarget() : undefined,
					url.origin
				);
			}
		} catch (e) {
			console.error('[forgot-password]', e);
			const smtpRejected =
				e instanceof Error && (e.message.includes('EAUTH') || /535|Invalid login/i.test(e.message));
			if (!isProductionRuntime() && smtpRejected) {
				return fail(500, {
					message:
						'Could not send mail: the SMTP login was rejected. Set a real SMTP_PASSWORD, or MAIL_DEV_ONLY=true to log the reset link in the server console instead.'
				});
			}
			return fail(500, { message: 'Could not process that request. Try again later.' });
		}

		return { message: okMessage, ok: true };
	}
};
