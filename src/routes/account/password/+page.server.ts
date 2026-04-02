import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { hashPassword, verifyPassword } from '$lib/server/auth';
import { requireUser } from '$lib/server/guards';
import { users } from '$lib/server/schema';

export const load: PageServerLoad = async ({ locals }) => {
	requireUser(locals.user);
	return {
		mustChangePassword: locals.user!.mustChangePassword
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		requireUser(locals.user);
		const userId = locals.user!.id;

		const form = await request.formData();
		const current = String(form.get('current') ?? '');
		const next = String(form.get('password') ?? '');
		const next2 = String(form.get('password2') ?? '');

		const db = getDb();
		const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
		const row = rows[0];
		if (!row) {
			return fail(500, { message: 'Account not found.' });
		}

		const mustSupplyCurrent = !locals.user!.mustChangePassword;
		if (mustSupplyCurrent) {
			if (!current) {
				return fail(400, { message: 'Current password is required.' });
			}
			if (!(await verifyPassword(row.passwordHash, current))) {
				return fail(400, { message: 'Current password is incorrect.' });
			}
		}

		if (!next || next.length < 8) {
			return fail(400, { message: 'New password must be at least 8 characters.' });
		}
		if (next !== next2) {
			return fail(400, { message: 'New passwords do not match.' });
		}

		const passwordHash = await hashPassword(next);
		await db
			.update(users)
			.set({
				passwordHash,
				mustChangePassword: false,
				updatedAt: new Date()
			})
			.where(eq(users.id, userId));

		throw redirect(303, '/');
	}
};
