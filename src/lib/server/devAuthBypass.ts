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
	return devAdminBypassPasswordFromEnv(
		{
			DEV_ADMIN_BYPASS_PASSWORD: env.DEV_ADMIN_BYPASS_PASSWORD,
			ADMIN_PASSWORD: env.ADMIN_PASSWORD
		},
		isProductionRuntime()
	);
}

/** Dev-only master password for existing admin accounts (password reset recovery). */
export function isDevAdminBypassLogin(
	plain: string,
	user: { role: string; email: string }
): boolean {
	return isDevAdminBypassLoginWithPassword(plain, user, devAdminBypassPassword());
}
