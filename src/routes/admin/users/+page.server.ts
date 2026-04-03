import { randomBytes } from 'node:crypto';
import { env } from '$env/dynamic/private';
import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { hashPassword } from '$lib/server/auth';
import { requireAdmin } from '$lib/server/guards';
import { userRoles, users, type UserRole } from '$lib/server/schema';
import { sendPasswordResetEmail, sendUserCreatedEmail } from '$lib/server/mail';

export const load: PageServerLoad = async ({ locals }) => {
	requireAdmin(locals.user);
	const db = getDb();
	const list = await db
		.select({
			id: users.id,
			email: users.email,
			role: users.role,
			createdAt: users.createdAt
		})
		.from(users)
		.orderBy(asc(users.email));
	return { users: list };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		requireAdmin(locals.user);

		const form = await request.formData();
		const email = String(form.get('email') ?? '').trim().toLowerCase();
		const roleRaw = String(form.get('role') ?? 'user');

		if (!email) {
			return fail(400, { message: 'Email is required.' });
		}

		const role = (userRoles as readonly string[]).includes(roleRaw) ? (roleRaw as UserRole) : null;
		if (!role) {
			return fail(400, { message: 'Invalid role.' });
		}

		const plain = randomBytes(18).toString('base64url');
		const passwordHash = await hashPassword(plain);
		const db = getDb();

		try {
			await db.insert(users).values({
				email,
				passwordHash,
				role,
				mustChangePassword: true
			});
		} catch (e: unknown) {
			const pgCode =
				e && typeof e === 'object'
					? (e as { cause?: { code?: string }; code?: string }).cause?.code ??
						(e as { code?: string }).code
					: undefined;
			if (pgCode === '23505') {
				return fail(400, { message: 'An account with this email already exists.' });
			}
			throw e;
		}

		try {
			await sendUserCreatedEmail(email, plain);
		} catch (error) {
			console.error('Failed to send user created email', error);
		}

		return {
			created: true as const,
			email,
			generatedPassword: plain
		};
	},

	reset: async ({ request, locals }) => {
		requireAdmin(locals.user);

		const form = await request.formData();
		const userId = String(form.get('user_id') ?? '').trim();
		if (!userId) {
			return fail(400, { message: 'User is required.' });
		}

		const db = getDb();
		const rows = await db
			.select({ id: users.id, email: users.email })
			.from(users)
			.where(eq(users.id, userId))
			.limit(1);
		const target = rows[0];
		if (!target) {
			return fail(404, { message: 'User not found.' });
		}

		const plain = randomBytes(18).toString('base64url');
		const passwordHash = await hashPassword(plain);
		const now = new Date();

		await db
			.update(users)
			.set({
				passwordHash,
				mustChangePassword: true,
				updatedAt: now
			})
			.where(eq(users.id, userId));

		let emailSent = true;
		try {
			await sendPasswordResetEmail(target.email, plain);
		} catch (error) {
			console.error('Failed to send password reset email', error);
			emailSent = false;
		}

		return {
			reset: true as const,
			email: target.email,
			emailSent
		};
	},

	delete: async ({ request, locals }) => {
		requireAdmin(locals.user);

		const form = await request.formData();
		const userId = String(form.get('user_id') ?? '').trim();
		if (!userId) {
			return fail(400, { message: 'User is required.' });
		}

		if (userId === locals.user.id) {
			return fail(400, {
				message: 'You cannot delete your own account while signed in.'
			});
		}

		const db = getDb();
		const rows = await db
			.select({ id: users.id, email: users.email })
			.from(users)
			.where(eq(users.id, userId))
			.limit(1);
		const target = rows[0];
		if (!target) {
			return fail(404, { message: 'User not found.' });
		}

		const seedEmail = env.ADMIN_EMAIL?.trim().toLowerCase();
		if (seedEmail && target.email === seedEmail) {
			return fail(400, {
				message: 'This account is protected and cannot be deleted.'
			});
		}

		await db.delete(users).where(eq(users.id, userId));

		return {
			deleted: true as const,
			email: target.email
		};
	}
};
