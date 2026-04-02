import { redirect } from '@sveltejs/kit';
import type { SessionUser } from './auth';

export function requireUser(user: SessionUser | null): asserts user is SessionUser {
	if (!user) {
		throw redirect(303, '/login');
	}
}

export function requireAdmin(user: SessionUser | null): asserts user is SessionUser & { role: 'admin' } {
	requireUser(user);
	if (user.role !== 'admin') {
		throw redirect(303, '/');
	}
}
