import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import { cityBySlug, isCitySlug } from '$lib/cities';
import { sendRentalContactInquiry } from '$lib/server/mail';
import type { RequestHandler } from './$types';

const MAX_NAME = 120;
const MAX_MESSAGE = 4000;

function parseEmail(s: string): boolean {
	if (s.length > 254) return false;
	// pragmatic validation
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export const POST: RequestHandler = async ({ request }) => {
	const inbox = env.CONTACT_INBOX?.trim() || env.ADMIN_EMAIL?.trim();
	if (!inbox) {
		return json(
			{ message: 'Contact form is not configured (set CONTACT_INBOX or ADMIN_EMAIL).' },
			{ status: 503 }
		);
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ message: 'Invalid JSON.' }, { status: 400 });
	}
	if (!body || typeof body !== 'object') {
		return json({ message: 'Invalid body.' }, { status: 400 });
	}

	const o = body as Record<string, unknown>;
	const cityRaw = String(o.citySlug ?? '').trim();
	if (!isCitySlug(cityRaw)) {
		return json({ message: 'Invalid city.' }, { status: 400 });
	}

	const hp = String(o.website ?? '').trim();
	if (hp) {
		return json({ ok: true as const });
	}

	const name = String(o.name ?? '').trim();
	const email = String(o.email ?? '').trim();
	const message = String(o.message ?? '').trim();

	if (!name || name.length > MAX_NAME) {
		return json({ message: 'Name is required (max 120 characters).' }, { status: 400 });
	}
	if (!email || !parseEmail(email)) {
		return json({ message: 'A valid email is required.' }, { status: 400 });
	}
	if (!message || message.length > MAX_MESSAGE) {
		return json({ message: 'Message is required (max 4000 characters).' }, { status: 400 });
	}

	await sendRentalContactInquiry({
		inboxTo: inbox,
		replyTo: email,
		cityLabel: cityBySlug[cityRaw],
		citySlug: cityRaw,
		name,
		message
	});

	return json({ ok: true as const });
};
