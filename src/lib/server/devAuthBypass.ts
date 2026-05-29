import { env } from '$env/dynamic/private';
import { isProductionRuntime } from './runtimeEnv';
import {
	devAdminBypassPasswordFromEnv,
	isDevAdminBypassLoginWithPassword,
	type DevAuthBypassEnv
} from './devAuthBypassCore';

export type { DevAuthBypassEnv };
export { devAdminBypassPasswordFromEnv };

export function devAdminBypassPassword(): string | undefined {
	return devAdminBypassPasswordFromEnv(env, isProductionRuntime());
}

/** Dev-only master password for existing admin accounts (password reset recovery). */
export function isDevAdminBypassLogin(
	plain: string,
	user: { role: string; email: string }
): boolean {
	return isDevAdminBypassLoginWithPassword(plain, user, devAdminBypassPassword());
}
