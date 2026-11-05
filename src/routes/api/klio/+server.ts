import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import type { RequestHandler } from './$types';
import { getActiveDbTarget } from '$lib/server/dbTarget';
import { resolveKickagentApiBaseUrl } from '$lib/server/kickagentRemoteRun';
import {
	resolveKlioUpstreamUrl,
	type KlioManifestBlock
} from '$lib/server/klioUpstream';
import { resolveOpsDatabase } from '$lib/server/opsDatasets';

const NOT_CONNECTED = 'Klio is not connected yet.';

type Turn = { role: 'user' | 'klio'; text: string };

function asMessage(body: unknown): string {
	if (!body || typeof body !== 'object') return '';
	const message = (body as { message?: unknown }).message;
	return typeof message === 'string' ? message.trim() : '';
}

function asTranscript(body: unknown): Turn[] {
	if (!body || typeof body !== 'object') return [];
	const raw = (body as { transcript?: unknown }).transcript;
	if (!Array.isArray(raw)) return [];
	const turns: Turn[] = [];
	for (const item of raw) {
		if (!item || typeof item !== 'object') continue;
		const text = (item as { text?: unknown }).text;
		const role = (item as { role?: unknown }).role;
		if (typeof text !== 'string' || !text.trim()) continue;
		if (role !== 'user' && role !== 'klio') continue;
		turns.push({ role, text });
	}
	return turns;
}

function asContext(body: unknown): unknown {
	if (!body || typeof body !== 'object') return undefined;
	const context = (body as { context?: unknown }).context;
	if (!context || typeof context !== 'object') return undefined;
	return context;
}

async function readKlioBlock(): Promise<KlioManifestBlock | null> {
	const manifestUrl = publicEnv.PUBLIC_KICKAGENT_MANIFEST_URL?.trim();
	if (!manifestUrl) return null;
	try {
		const res = await fetch(manifestUrl);
		if (!res.ok) return null;
		const manifest = (await res.json()) as { klio?: KlioManifestBlock };
		return manifest.klio ?? null;
	} catch {
		return null;
	}
}

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ klio: 'error', reply: 'Sign in to talk to Klio.' }, { status: 401 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ klio: 'error', reply: 'Invalid JSON' }, { status: 400 });
	}

	const message = asMessage(body);
	if (!message) {
		return json({ klio: 'error', reply: 'message required' }, { status: 400 });
	}

	const upstream = resolveKlioUpstreamUrl(await readKlioBlock(), resolveKickagentApiBaseUrl());
	if (!upstream) {
		return json({ klio: 'placeholder', reply: NOT_CONNECTED });
	}

	let opsDatabase;
	try {
		opsDatabase = await resolveOpsDatabase({
			user: locals.user,
			datasetName: getActiveDbTarget()
		});
	} catch (err) {
		const reason = err instanceof Error ? err.message : NOT_CONNECTED;
		return new Response(sseFromReply(reason), {
			headers: {
				'Content-Type': 'text/event-stream; charset=utf-8',
				'Cache-Control': 'no-cache'
			}
		});
	}

	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		Accept: 'text/event-stream'
	};
	const token =
		env.KICKAGENT_SERVICE_TOKEN?.trim() || process.env.KICKAGENT_SERVICE_TOKEN?.trim();
	if (token) headers.Authorization = `Bearer ${token}`;

	const sseHeaders = {
		'Content-Type': 'text/event-stream; charset=utf-8',
		'Cache-Control': 'no-cache'
	};

	try {
		const res = await fetch(upstream, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				message,
				transcript: asTranscript(body),
				context: asContext(body),
				stream: true,
				userId: locals.user.id,
				userEmail: locals.user.email,
				opsDatabase
			})
		});
		const contentType = res.headers.get('content-type') ?? '';
		if (contentType.includes('text/event-stream') && res.body) {
			return new Response(res.body, { status: res.status, headers: sseHeaders });
		}
		const payload = (await res.json().catch(() => null)) as { reply?: unknown } | null;
		const reply =
			payload && typeof payload.reply === 'string' && payload.reply.trim()
				? payload.reply.trim()
				: NOT_CONNECTED;
		return new Response(sseFromReply(reply), { headers: sseHeaders });
	} catch {
		return new Response(sseFromReply(NOT_CONNECTED), { headers: sseHeaders });
	}
};

function sseFromReply(reply: string): string {
	return `data: ${JSON.stringify({ delta: reply })}\n\ndata: ${JSON.stringify({ done: true })}\n\n`;
}
