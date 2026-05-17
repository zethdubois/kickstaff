import { env } from '$env/dynamic/private';
import type { SessionUser } from './auth';

/** Matches ADMIN_EMAIL — same rule as the SUPER badge on /admin/users. */
export function isSuperUser(user: SessionUser | null): boolean {
	if (!user) return false;
	const seed = env.ADMIN_EMAIL?.trim().toLowerCase();
	if (!seed) return false;
	return user.email.toLowerCase() === seed;
}
