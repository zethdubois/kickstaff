import { createHash, randomBytes } from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';
import { and, eq, gt } from 'drizzle-orm';
import type { Cookies } from '@sveltejs/kit';
import { getDb } from './db';
import { getActiveDbTarget, runWithDbTarget, type DbTarget } from './dbTarget';
import {
	ALL_DB_TARGETS,
	SESSION_TOUCH_INTERVAL_MS,
	isSessionIdleExpired,
	sessionCookieName,
	sessionPolicyForTarget
} from './dbTargetCore';
import { passwordResetTokens, sessions, users } from './schema';

/** Pre-per-database cookie name; cleared on logout so old browsers don't keep it around. */
export const LEGACY_SESSION_COOKIE = 'ka_session';

/** Session cookie for the database this request is running against. */
export function activeSessionCookieName(): string {
	return sessionCookieName(getActiveDbTarget());
}

/** Paths that stay reachable while `must_change_password` is true (assets, change form, logout). */
export function isPasswordChangeExemptPath(pathname: string): boolean {
	if (pathname === '/account/password') return true;
	if (pathname === '/logout' || pathname.startsWith('/logout/')) return true;
	if (pathname.startsWith('/_app/')) return true;
	const last = pathname.split('/').pop() ?? '';
	if (last.includes('.') && last.length > 1) return true;
	return false;
}

export function sessionCookieOptions(url: URL, target: DbTarget): Parameters<Cookies['set']>[2] {
	const policy = sessionPolicyForTarget(target);
	return {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: url.protocol === 'https:',
		// Non-persistent policies omit Max-Age: closing the browser drops the cookie.
		...(policy.persistentCookie ? { maxAge: Math.floor(policy.absoluteMs / 1000) } : {})
	};
}

function hashSessionToken(token: string): string {
	return createHash('sha256').update(token, 'utf8').digest('hex');
}

function newSessionToken(): string {
	return randomBytes(32).toString('base64url');
}

export async function hashPassword(plain: string): Promise<string> {
	return hash(plain);
}

export async function verifyPassword(hashStr: string, plain: string): Promise<boolean> {
	try {
		return await verify(hashStr, plain);
	} catch {
		return false;
	}
}

/** Opaque one-time password for seeds / admin resets (printed or emailed once). */
export function generateRandomPassword(bytes = 18): string {
	return randomBytes(bytes).toString('base64url');
}

const RESET_TOKEN_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

function hashResetToken(token: string): string {
	return createHash('sha256').update(token, 'utf8').digest('hex');
}

/** Create a one-time reset token; returns the raw token to put in the email link. */
export async function createPasswordResetToken(userId: string): Promise<string> {
	const db = getDb();
	await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
	const token = randomBytes(32).toString('base64url');
	await db.insert(passwordResetTokens).values({
		userId,
		tokenHash: hashResetToken(token),
		expiresAt: new Date(Date.now() + RESET_TOKEN_MAX_AGE_MS)
	});
	return token;
}

export async function consumePasswordResetToken(
	rawToken: string
): Promise<{ userId: string } | null> {
	const token = rawToken.trim();
	if (!token) return null;
	const db = getDb();
	const tokenHash = hashResetToken(token);
	const now = new Date();
	const rows = await db
		.select({
			id: passwordResetTokens.id,
			userId: passwordResetTokens.userId
		})
		.from(passwordResetTokens)
		.where(and(eq(passwordResetTokens.tokenHash, tokenHash), gt(passwordResetTokens.expiresAt, now)))
		.limit(1);
	const row = rows[0];
	if (!row) return null;
	await db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, row.id));
	return { userId: row.userId };
}

export async function findUserByEmail(email: string) {
	const db = getDb();
	const normalized = email.trim().toLowerCase();
	const rows = await db.select().from(users).where(eq(users.email, normalized)).limit(1);
	return rows[0];
}

export type SessionUser = {
	id: string;
	email: string;
	role: string;
	mustChangePassword: boolean;
};

/**
 * Resolve the signed-in user for a session token against the ACTIVE database
 * (the request-scoped target). Enforces absolute expiry and the per-target idle limit.
 */
export async function getUserFromSessionToken(token: string): Promise<SessionUser | null> {
	const db = getDb();
	const policy = sessionPolicyForTarget(getActiveDbTarget());
	const tokenHash = hashSessionToken(token);
	const now = new Date();
	const rows = await db
		.select({
			sessionId: sessions.id,
			lastSeenAt: sessions.lastSeenAt,
			id: users.id,
			email: users.email,
			role: users.role,
			mustChangePassword: users.mustChangePassword
		})
		.from(sessions)
		.innerJoin(users, eq(sessions.userId, users.id))
		.where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, now)))
		.limit(1);

	const row = rows[0];
	if (!row) return null;
	if (isSessionIdleExpired(row.lastSeenAt, now, policy.idleMs)) return null;

	if (now.getTime() - row.lastSeenAt.getTime() > SESSION_TOUCH_INTERVAL_MS) {
		await db.update(sessions).set({ lastSeenAt: now }).where(eq(sessions.id, row.sessionId));
	}

	return {
		id: row.id,
		email: row.email,
		role: row.role,
		mustChangePassword: row.mustChangePassword
	};
}

/** Create a session in the ACTIVE database and set that database's cookie. */
export async function createSession(userId: string, cookies: Cookies, url: URL): Promise<void> {
	const db = getDb();
	const target = getActiveDbTarget();
	const policy = sessionPolicyForTarget(target);
	const token = newSessionToken();
	const tokenHash = hashSessionToken(token);
	const expiresAt = new Date(Date.now() + policy.absoluteMs);

	await db.insert(sessions).values({
		userId,
		tokenHash,
		expiresAt
	});

	cookies.set(sessionCookieName(target), token, sessionCookieOptions(url, target));
}

/** Delete a session row in the ACTIVE database. */
export async function deleteSessionForToken(token: string | undefined): Promise<void> {
	if (!token) return;
	const db = getDb();
	const tokenHash = hashSessionToken(token);
	await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
}

/**
 * Does the browser hold a valid session for `target`? Checked against THAT database
 * (never trusts the cookie's mere presence).
 */
export async function hasValidSessionForTarget(
	target: DbTarget,
	cookies: Cookies
): Promise<boolean> {
	const token = cookies.get(sessionCookieName(target));
	if (!token) return false;
	return runWithDbTarget(target, async () => {
		try {
			return (await getUserFromSessionToken(token)) !== null;
		} catch {
			return false;
		}
	});
}

/** Sign out of one database: delete its session row (best effort) and clear its cookie. */
export async function signOutOfTarget(target: DbTarget, cookies: Cookies): Promise<void> {
	const name = sessionCookieName(target);
	const token = cookies.get(name);
	if (token) {
		await runWithDbTarget(target, async () => {
			try {
				await deleteSessionForToken(token);
			} catch {
				/* DB unreachable — still clear the cookie */
			}
		});
	}
	cookies.delete(name, { path: '/' });
}

/** Sign out of every database this browser has a session for, plus the legacy cookie. */
export async function signOutOfAllTargets(cookies: Cookies): Promise<void> {
	for (const target of ALL_DB_TARGETS) {
		await signOutOfTarget(target, cookies);
	}
	cookies.delete(LEGACY_SESSION_COOKIE, { path: '/' });
}
