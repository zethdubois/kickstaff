import { createHash, randomBytes } from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';
import { and, eq, gt } from 'drizzle-orm';
import type { Cookies } from '@sveltejs/kit';
import { getDb } from './db';
import { sessions, users } from './schema';

export const SESSION_COOKIE = 'ka_session';

/** Paths that stay reachable while `must_change_password` is true (assets, change form, logout). */
export function isPasswordChangeExemptPath(pathname: string): boolean {
	if (pathname === '/account/password') return true;
	if (pathname === '/logout' || pathname.startsWith('/logout/')) return true;
	if (pathname.startsWith('/_app/')) return true;
	const last = pathname.split('/').pop() ?? '';
	if (last.includes('.') && last.length > 1) return true;
	return false;
}

/** 7 days */
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7;

export function sessionCookieOptions(url: URL): Parameters<Cookies['set']>[2] {
	return {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: url.protocol === 'https:',
		maxAge: SESSION_MAX_AGE_SEC
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

export async function getUserFromSessionToken(token: string): Promise<SessionUser | null> {
	const db = getDb();
	const tokenHash = hashSessionToken(token);
	const now = new Date();
	const rows = await db
		.select({
			id: users.id,
			email: users.email,
			role: users.role,
			mustChangePassword: users.mustChangePassword
		})
		.from(sessions)
		.innerJoin(users, eq(sessions.userId, users.id))
		.where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, now)))
		.limit(1);

	return rows[0] ?? null;
}

export async function createSession(userId: string, cookies: Cookies, url: URL): Promise<void> {
	const db = getDb();
	const token = newSessionToken();
	const tokenHash = hashSessionToken(token);
	const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SEC * 1000);

	await db.insert(sessions).values({
		userId,
		tokenHash,
		expiresAt
	});

	cookies.set(SESSION_COOKIE, token, sessionCookieOptions(url));
}

export async function deleteSessionForToken(token: string | undefined): Promise<void> {
	if (!token) return;
	const db = getDb();
	const tokenHash = hashSessionToken(token);
	await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
}
