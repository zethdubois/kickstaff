import type { Actions, PageServerLoad } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import {
	createSession,
	findUserByEmail,
	verifyPassword
} from '$lib/server/auth';
import { isDevAdminBypassLogin } from '$lib/server/devAuthBypass';
import { messageForDbError } from '$lib/server/dbErrors';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		throw redirect(303, '/');
	}
	return {};
};

export const actions: Actions = {
	/** Stale browsers may still POST here from an old cached login page; avoid 404. */
	register: async () => {
		return fail(400, {
			message:
				'Self-registration is disabled. Ask an administrator for an account. If this form still mentions “Create account”, hard-refresh the page (Ctrl+Shift+R).'
		});
	},

	login: async ({ cookies, request, url }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '')
			.trim()
			.toLowerCase();
		/** Trim: pasted passwords often include a trailing newline or space. */
		const password = String(form.get('password') ?? '').trim();

		if (!email || !password) {
			return fail(400, { message: 'Email and password are required.' });
		}

		let user;
		try {
			user = await findUserByEmail(email);
		} catch (e) {
			const hint = messageForDbError(e);
			if (!hint) console.error(e);
			return fail(500, {
				message: hint ?? 'Server error. Is DATABASE_URL configured?'
			});
		}

		if (!user) {
			return fail(400, {
				message:
					'No account for that email in this database. Check spelling. If you use Railway, confirm your local DATABASE_URL matches the DB where the user was created — run `pnpm list:users` to see who exists here.'
			});
		}

		const passwordOk =
			(await verifyPassword(user.passwordHash, password)) ||
			isDevAdminBypassLogin(password, user);
		if (!passwordOk) {
			return fail(400, { message: 'Wrong password. If you pasted it, try again without extra spaces.' });
		}

		await createSession(user.id, cookies, url);
		if (user.mustChangePassword) {
			throw redirect(303, '/account/password');
		}
		throw redirect(303, '/');
	}
};
