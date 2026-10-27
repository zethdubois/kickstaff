/**
 * Create the first admin user if missing (role `admin`; SUPER = email === ADMIN_EMAIL).
 * Password is random — printed once (and emailed when SMTP is configured).
 *
 * Usage (from repo root, with .env or env vars):
 *   pnpm seed:admin
 *   pnpm seed:admin --db staging
 *   pnpm seed:admin --db prod
 *
 * Requires: matching DATABASE_URL_* for the target, ADMIN_EMAIL
 */
import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { hash } from '@node-rs/argon2';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import nodemailer from 'nodemailer';
import pg from 'pg';
import * as schema from '../src/lib/server/schema.ts';
import {
	getCliDbDisplayInfo,
	resolveCliConnectionString,
	resolveCliDbTarget,
	warnIfExplicitProdCliTarget
} from './lib/dbCli.ts';

const { users } = schema;

function generateRandomPassword(bytes = 18): string {
	return randomBytes(bytes).toString('base64url');
}

async function maybeEmailTempPassword(email: string, plain: string): Promise<boolean> {
	const host = process.env.SMTP_HOST?.trim();
	const port = process.env.SMTP_PORT?.trim();
	const user = process.env.SMTP_USER?.trim();
	const pass = process.env.SMTP_PASSWORD?.trim();
	const devOnly = process.env.MAIL_DEV_ONLY?.trim().toLowerCase() === 'true';
	const base = process.env.PUBLIC_BASE_URL?.trim().replace(/\/+$/, '') ?? '';
	const loginUrl = base ? `${base}/login` : '/login';
	const from = user || process.env.ADMIN_EMAIL?.trim() || 'no-reply@example.com';
	const text = [
		'Hello,',
		'',
		'A new admin account has been created for you.',
		`Email: ${email}`,
		`Temporary password: ${plain}`,
		'',
		`Sign in: ${loginUrl}`,
		'',
		'You will be asked to change this password after you log in.',
		'You can also use Forgot password on the login page.'
	].join('\n');

	if (devOnly || !host || !port || !user || !pass) {
		if (devOnly) {
			console.info('[MAIL] MAIL_DEV_ONLY=true — not sending; password is printed below.');
		}
		return false;
	}

	const transporter = nodemailer.createTransport({
		host,
		port: Number(port),
		secure: process.env.SMTP_SECURE?.trim().toLowerCase() === 'true' || Number(port) === 465,
		auth: { user, pass }
	});
	await transporter.sendMail({
		from,
		to: email,
		subject: 'Your new KAM admin account',
		text
	});
	console.info('[MAIL] Sent temporary password to', email);
	return true;
}

async function main() {
	const cliArgv = process.argv.slice(2);
	warnIfExplicitProdCliTarget(cliArgv);
	const target = resolveCliDbTarget(cliArgv);
	const url = resolveCliConnectionString(target);
	const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();

	console.log('Database:', getCliDbDisplayInfo(target).label);
	if (!email) {
		console.error('ADMIN_EMAIL is required');
		process.exit(1);
	}

	const pool = new pg.Pool({ connectionString: url });
	const db = drizzle(pool, { schema });

	const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
	if (existing.length > 0) {
		console.log('User already exists:', email);
		console.log('To rotate password: pnpm reset:admin-password --db', target);
		await pool.end();
		return;
	}

	const plain = generateRandomPassword();
	const passwordHash = await hash(plain);
	await db.insert(users).values({
		email,
		passwordHash,
		role: 'admin',
		mustChangePassword: true
	});

	const emailed = await maybeEmailTempPassword(email, plain).catch((e) => {
		console.warn('[MAIL] Failed to send:', e instanceof Error ? e.message : e);
		return false;
	});

	console.log('Created admin user:', email);
	console.log('Temporary password (save now; not stored in env):', plain);
	if (!emailed) {
		console.log('(No email sent — configure SMTP or use Forgot password after deploy.)');
	}

	await pool.end();
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
