import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import {
	consumePasswordResetToken,
	createSession,
	hashPassword
} from '$lib/server/auth';
import { getDb } from '$lib/server/db';
import { users } from '$lib/server/schema';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.user) {
		throw redirect(303, '/');
	}
	const token = url.searchParams.get('token')?.trim() ?? '';
	return { token, hasToken: token.length > 0 };
};

export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		const form = await request.formData();
		const token = String(form.get('token') ?? '').trim();
		const next = String(form.get('password') ?? '');
		const next2 = String(form.get('password2') ?? '');

		if (!token) {
			return fail(400, {
				message: 'Missing reset token. Use the link from your email.',
				token: ''
			});
		}
		if (!next || next.length < 8) {
			return fail(400, { message: 'New password must be at least 8 characters.', token });
		}
		if (next !== next2) {
			return fail(400, { message: 'New passwords do not match.', token });
		}

		const consumed = await consumePasswordResetToken(token);
		if (!consumed) {
			return fail(400, {
				message: 'This reset link is invalid or has expired. Request a new one.',
				token: ''
			});
		}

		const passwordHash = await hashPassword(next);
		const db = getDb();
		await db
			.update(users)
			.set({
				passwordHash,
				mustChangePassword: false,
				updatedAt: new Date()
			})
			.where(eq(users.id, consumed.userId));

		await createSession(consumed.userId, cookies, url);
		throw redirect(303, '/');
	}
};
