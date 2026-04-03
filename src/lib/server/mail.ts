import { env } from '$env/dynamic/private';

type MailPayload = {
	to: string;
	subject: string;
	text: string;
};

const hasSmtpConfig =
	Boolean(env.SMTP_HOST) &&
	Boolean(env.SMTP_PORT) &&
	Boolean(env.SMTP_USER) &&
	Boolean(env.SMTP_PASSWORD);

async function sendMail(payload: MailPayload) {
	const from = env.ADMIN_EMAIL || 'no-reply@example.com';

	// Placeholder implementation: log to server console so devs can see the email.
	// A future task can wire this up to real SMTP (e.g. nodemailer) using the same payload shape.
	console.info('[MAIL] Sending email', {
		from,
		to: payload.to,
		subject: payload.subject,
		text: payload.text,
		smtpConfigured: hasSmtpConfig
	});
}

export async function sendUserCreatedEmail(email: string, plainPassword: string) {
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

	await sendMail({
		to: email,
		subject,
		text
	});
}

export async function sendPasswordResetEmail(email: string, temporaryPassword: string) {
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

	await sendMail({
		to: email,
		subject,
		text
	});
}
