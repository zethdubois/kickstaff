import { env } from '$env/dynamic/private';
import nodemailer from 'nodemailer';

type MailPayload = {
	to: string;
	subject: string;
	text: string;
	replyTo?: string;
};

function smtpConfigured(): boolean {
	return Boolean(
		env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASSWORD
	);
}

let transporter: nodemailer.Transporter | null = null;

function smtpSecure(): boolean {
	const s = env.SMTP_SECURE?.trim().toLowerCase();
	if (s === 'true' || s === '1') return true;
	if (s === 'false' || s === '0') return false;
	const port = Number(env.SMTP_PORT);
	return port === 465;
}

function getTransporter(): nodemailer.Transporter | null {
	if (!smtpConfigured()) return null;
	if (!transporter) {
		transporter = nodemailer.createTransport({
			host: env.SMTP_HOST,
			port: Number(env.SMTP_PORT),
			secure: smtpSecure(),
			auth: {
				user: env.SMTP_USER,
				pass: env.SMTP_PASSWORD
			}
		});
	}
	return transporter;
}

async function sendMail(payload: MailPayload): Promise<boolean> {
	const devOnly = env.MAIL_DEV_ONLY?.trim().toLowerCase() === 'true';
	const from = env.ADMIN_EMAIL?.trim() || 'no-reply@example.com';

	if (devOnly) {
		console.info('[MAIL] MAIL_DEV_ONLY=true — skipping SMTP and logging only', {
			from,
			to: payload.to,
			replyTo: payload.replyTo,
			subject: payload.subject,
			text: payload.text
		});
		return false;
	}

	const t = getTransporter();

	if (t) {
		if (!env.ADMIN_EMAIL?.trim()) {
			console.warn(
				'[MAIL] ADMIN_EMAIL is not set; using default From. Many SMTP providers require a verified sender address.'
			);
		}
		await t.sendMail({
			from,
			to: payload.to,
			subject: payload.subject,
			text: payload.text,
			...(payload.replyTo ? { replyTo: payload.replyTo } : {})
		});
		console.info('[MAIL] Sent via SMTP', { from, to: payload.to, subject: payload.subject });
		return true;
	}

	console.info(
		'[MAIL] No SMTP configured — logging only (set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD)',
		{
			from,
			to: payload.to,
			replyTo: payload.replyTo,
			subject: payload.subject,
			text: payload.text
		}
	);
	return false;
}

export async function sendUserCreatedEmail(email: string, plainPassword: string): Promise<boolean> {
	const loginUrl =
		env.PUBLIC_BASE_URL && typeof env.PUBLIC_BASE_URL === 'string'
			? `${env.PUBLIC_BASE_URL}/login`
			: '/login';

	const subject = 'Your new KAM account';
	const text = [
		'Hello,',
		'',
		'A new account has been created for you.',
		`Email: ${email}`,
		`Temporary password: ${plainPassword}`,
		'',
		`You can sign in here: ${loginUrl}`,
		'',
		'For security, you will be asked to change this password after you first log in.'
	].join('\n');

	return sendMail({
		to: email,
		subject,
		text
	});
}

export async function sendPasswordResetEmail(
	email: string,
	temporaryPassword: string
): Promise<boolean> {
	const loginUrl =
		env.PUBLIC_BASE_URL && typeof env.PUBLIC_BASE_URL === 'string'
			? `${env.PUBLIC_BASE_URL}/login`
			: '/login';

	const subject = 'Your password has been reset';
	const text = [
		'Hello,',
		'',
		'An administrator has reset your password for your KAM account.',
		`Temporary password: ${temporaryPassword}`,
		'',
		`You can sign in here: ${loginUrl}`,
		'',
		'For security, you will be asked to choose a new password after you log in.'
	].join('\n');

	return sendMail({
		to: email,
		subject,
		text
	});
}

/** Public rental “Contact us” form; delivers to CONTACT_INBOX or ADMIN_EMAIL. */
export async function sendRentalContactInquiry(opts: {
	inboxTo: string;
	replyTo: string;
	cityLabel: string;
	citySlug: string;
	name: string;
	message: string;
}): Promise<boolean> {
	const subject = `[Rental contact] ${opts.cityLabel}`;
	const text = [
		`City: ${opts.cityLabel} (${opts.citySlug})`,
		`From: ${opts.name} <${opts.replyTo}>`,
		'',
		opts.message
	].join('\n');

	return sendMail({
		to: opts.inboxTo,
		subject,
		text,
		replyTo: opts.replyTo
	});
}
