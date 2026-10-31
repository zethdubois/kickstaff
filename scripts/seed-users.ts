/**
 * Create one or more users with random temp passwords (printed once; emailed when SMTP works).
 * Skips emails that already exist. Default role: admin.
 *
 * Usage (from repo root, with .env):
 *   pnpm seed:users -- max@example.com other@example.com
 *   pnpm seed:users --db prod -- --role admin max@example.com
 *   pnpm seed:users --db prod -- --role user someone@example.com
 *
 * Requires: matching DATABASE_URL_* for the target
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
	parseCliDbArgv,
	resolveCliConnectionString,
	resolveCliDbTarget,
	warnIfExplicitProdCliTarget
} from './lib/dbCli.ts';

const { users, userRoles } = schema;
type UserRole = (typeof userRoles)[number];

function generateRandomPassword(bytes = 18): string {
	return randomBytes(bytes).toString('base64url');
}

function parseArgs(argv: string[]): { emails: string[]; role: UserRole } {
	const { argv: rest } = parseCliDbArgv(argv);
	let role: UserRole = 'admin';
	const emails: string[] = [];

	for (let i = 0; i < rest.length; i++) {
		const arg = rest[i]!;
		if (arg === '--') continue;
		if (arg === '--role' && rest[i + 1]) {
			const raw = rest[i + 1]!.toLowerCase();
			if (!(userRoles as readonly string[]).includes(raw)) {
				throw new Error(`Invalid --role ${raw}; expected ${userRoles.join('|')}`);
			}
			role = raw as UserRole;
			i++;
			continue;
		}
		if (arg.startsWith('-')) {
			throw new Error(`Unknown flag: ${arg}`);
		}
		const email = arg.trim().toLowerCase();
		if (email.includes('@')) emails.push(email);
		else throw new Error(`Not an email: ${arg}`);
	}

	if (emails.length === 0) {
		throw new Error(
			'usage: pnpm seed:users [--db dev|staging|prod] [-- --role admin|user] <email…>'
		);
	}
	return { emails, role };
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
		'A new account has been created for you.',
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
		subject: 'Your new KAM account',
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
	const { emails, role } = parseArgs(cliArgv);

	console.log('Database:', getCliDbDisplayInfo(target).label);
	console.log('Role:', role);
	console.log('Emails:', emails.join(', '));

	const pool = new pg.Pool({ connectionString: url });
	const db = drizzle(pool, { schema });

	let created = 0;
	let skipped = 0;

	for (const email of emails) {
		const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
		if (existing.length > 0) {
			console.log('Already exists (skip):', email, `[${existing[0]!.role}]`);
			skipped++;
			continue;
		}

		const plain = generateRandomPassword();
		const passwordHash = await hash(plain);
		await db.insert(users).values({
			email,
			passwordHash,
			role,
			mustChangePassword: true
		});

		const emailed = await maybeEmailTempPassword(email, plain).catch((e) => {
			console.warn('[MAIL] Failed to send:', e instanceof Error ? e.message : e);
			return false;
		});

		console.log('Created:', email);
		console.log('Temporary password (save now):', plain);
		if (!emailed) {
			console.log('(No email sent — configure SMTP or use Forgot password.)');
		}
		created++;
	}

	console.log(`Done. created=${created} skipped=${skipped}`);
	await pool.end();
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
