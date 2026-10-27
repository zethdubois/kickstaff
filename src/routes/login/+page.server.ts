import type { Actions, PageServerLoad } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import {
	createSession,
	findUserByEmail,
	verifyPassword
} from '$lib/server/auth';
import { isDevAdminBypassLogin } from '$lib/server/devAuthBypass';
import { messageForDbError } from '$lib/server/dbErrors';
import {
	getDbDisplayInfo,
	isDbSwitchingEnabled,
	resolveConnectionString
} from '$lib/server/dbTarget';
import { getMigrationStatus } from '$lib/server/migrationStatus';
import { sessionPolicyForTarget } from '$lib/server/dbTargetCore';

function formatDuration(ms: number): string {
	const mins = Math.round(ms / 60_000);
	if (mins < 60) return `${mins} minutes`;
	const hours = Math.round(mins / 60);
	if (hours < 48) return `${hours} hour${hours === 1 ? '' : 's'}`;
	return `${Math.round(hours / 24)} days`;
}

/** Human summary of the session policy for the login hint. */
function describeSessionPolicy(target: Parameters<typeof sessionPolicyForTarget>[0]): string {
	const p = sessionPolicyForTarget(target);
	const parts = [`up to ${formatDuration(p.absoluteMs)}`];
	if (p.idleMs !== null) parts.push(`signed out after ${formatDuration(p.idleMs)} idle`);
	if (!p.persistentCookie) parts.push('ends when you close the browser');
	return `Session: ${parts.join(', ')}.`;
}

/**
 * The target for this request was already chosen in hooks (`?db=` > cookie > default),
 * and `locals.user` was resolved against THAT database's session cookie. So:
 * - a valid session for the requested DB → straight home
 * - no session for it → show login for that DB (other DBs' sessions are untouched)
 */
export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.user) {
		throw redirect(303, '/');
	}

	const info = getDbDisplayInfo();
	const requested = url.searchParams.get('db')?.trim();

	// Local only (where you can point at any DB): warn when this code is ahead of that DB's
	// schema — e.g. before deploying to prod. Sign-in itself breaks first, so login is where
	// you'd otherwise find out the hard way. Never exposed on deploys.
	let migrationWarning: string | null = null;
	if (isDbSwitchingEnabled()) {
		const m = await getMigrationStatus(resolveConnectionString(info.target));
		if (m.state === 'pending') {
			migrationWarning =
				`${info.target} has ${m.pendingCount} pending migration${m.pendingCount === 1 ? '' : 's'} ` +
				`(${m.pendingTags.join(', ')}). Sign-in may fail until you run: pnpm db:migrate --db ${info.target}`;
		}
	}

	return {
		migrationWarning,
		dbTarget: info.target,
		dbLabel: info.label,
		canPickDb: isDbSwitchingEnabled(),
		sessionNote: describeSessionPolicy(info.target),
		dbQueryError:
			locals.dbParamRejected && requested
				? `Database "${requested}" is not available here (unknown name, or its DATABASE_URL_* is not set). Using ${info.target}.`
				: null
	};
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

		// Target was resolved in hooks from this action URL's `?db=` (or the cookie).
		const info = getDbDisplayInfo();

		let user;
		try {
			user = await findUserByEmail(email);
		} catch (e) {
			const hint = messageForDbError(e);
			if (!hint) console.error(e);
			return fail(500, {
				message: hint ?? `Server error reaching ${info.target}. Is its DATABASE_URL set?`
			});
		}

		if (!user) {
			return fail(400, {
				message: `No account for that email in ${info.target} (${info.label}). Check spelling, or switch database on this page.`
			});
		}

		const passwordOk =
			(await verifyPassword(user.passwordHash, password)) ||
			isDevAdminBypassLogin(password, user);
		if (!passwordOk) {
			return fail(400, {
				message: `Wrong password for ${info.target} (${info.label}). Each database has its own accounts and passwords.`
			});
		}

		await createSession(user.id, cookies, url);
		if (user.mustChangePassword) {
			throw redirect(303, '/account/password');
		}
		throw redirect(303, '/');
	}
};
