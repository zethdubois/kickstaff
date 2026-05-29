import { timingSafeEqual } from 'node:crypto';

export type DevAuthBypassEnv = {
	DEV_ADMIN_BYPASS_PASSWORD?: string;
	ADMIN_PASSWORD?: string;
};

/** Non-production only. Prefer `DEV_ADMIN_BYPASS_PASSWORD`; fall back to `ADMIN_PASSWORD`. */
export function devAdminBypassPasswordFromEnv(
	bypassEnv: DevAuthBypassEnv,
	production: boolean
): string | undefined {
	if (production) return undefined;
	const explicit = bypassEnv.DEV_ADMIN_BYPASS_PASSWORD?.trim();
	if (explicit) return explicit;
	return bypassEnv.ADMIN_PASSWORD?.trim() || undefined;
}

function passwordsMatch(plain: string, expected: string): boolean {
	if (plain.length !== expected.length) return false;
	try {
		return timingSafeEqual(Buffer.from(plain, 'utf8'), Buffer.from(expected, 'utf8'));
	} catch {
		return false;
	}
}

export function isDevAdminBypassLoginWithPassword(
	plain: string,
	user: { role: string; email: string },
	bypass: string | undefined
): boolean {
	if (!bypass || user.role !== 'admin') return false;
	if (!passwordsMatch(plain, bypass)) return false;
	console.warn(`[auth] dev admin bypass login: ${user.email}`);
	return true;
}
