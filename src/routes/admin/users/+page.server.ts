import { randomBytes } from 'node:crypto';
import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { asc } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { hashPassword } from '$lib/server/auth';
import { requireAdmin } from '$lib/server/guards';
import { userRoles, users, type UserRole } from '$lib/server/schema';

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

		return {
			created: true as const,
			email,
			generatedPassword: plain
		};
	}
};
