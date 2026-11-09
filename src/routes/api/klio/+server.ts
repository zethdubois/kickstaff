import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import type { RequestHandler } from './$types';
import { getActiveDbTarget } from '$lib/server/dbTarget';
import { resolveKickagentApiBaseUrl } from '$lib/server/kickagentRemoteRun';
import {
	appendLine,
	findOpenConversation,
	listLines,
	openConversation,
	startNewConversation,
	type StoredKlioLine
} from '$lib/server/klioTranscript';
import {
	resolveKlioUpstreamUrl,
	type KlioManifestBlock
} from '$lib/server/klioUpstream';
import { resolveOpsDatabase } from '$lib/server/opsDatasets';
import { takeKlioSseEvents, type KlioSseEvent } from '$lib/klio/sse';

const NOT_CONNECTED = 'Klio is not connected yet.';

const sseHeaders = {
	'Content-Type': 'text/event-stream; charset=utf-8',
	'Cache-Control': 'no-cache'
};

function asMessage(body: unknown): string {
	if (!body || typeof body !== 'object') return '';
	const message = (body as { message?: unknown }).message;
	return typeof message === 'string' ? message.trim() : '';
}

function isNewChat(body: unknown): boolean {
	return !!body && typeof body === 'object' && (body as { newChat?: unknown }).newChat === true;
}

function asContext(body: unknown): unknown {
	if (!body || typeof body !== 'object') return undefined;
	const context = (body as { context?: unknown }).context;
	if (!context || typeof context !== 'object') return undefined;
	return context;
}

function applyEvent(event: KlioSseEvent, reply: string): string {
	if (typeof event.delta === 'string' && event.delta) return reply + event.delta;
	if (typeof event.error === 'string' && event.error.trim() && !reply) return event.error;
	return reply;
}

function consume(buffer: string, reply: string): { buffer: string; reply: string } {
	const taken = takeKlioSseEvents(buffer);
	let next = reply;
	for (const event of taken.events) next = applyEvent(event, next);
	return { buffer: taken.rest, reply: next };
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

function sseFromReply(reply: string): string {
	return `data: ${JSON.stringify({ delta: reply })}\n\ndata: ${JSON.stringify({ done: true })}\n\n`;
}

async function storeKlioLine(conversationId: string, reply: string): Promise<void> {
	const text = reply.trim() || NOT_CONNECTED;
	try {
		await appendLine(conversationId, 'klio', text);
	} catch (err) {
		console.error('[POST /api/klio] store reply', err);
	}
}

/** Forward upstream bytes and store the assembled reply when the stream ends. */
function streamAndStore(
	source: ReadableStream<Uint8Array>,
	conversationId: string,
	status = 200
): Response {
	const reader = source.getReader();
	const decoder = new TextDecoder();
	let buffer = '';
	let reply = '';
	const stream = new ReadableStream<Uint8Array>({
		async pull(controller) {
			const { done, value } = await reader.read();
			if (done) {
				const flushed = consume(`${buffer}\n\n`, reply);
				await storeKlioLine(conversationId, flushed.reply);
				controller.close();
				return;
			}
			controller.enqueue(value);
			buffer += decoder.decode(value, { stream: true });
			const taken = consume(buffer, reply);
			buffer = taken.buffer;
			reply = taken.reply;
		}
	});
	return new Response(stream, { status, headers: sseHeaders });
}

async function replyAndStore(conversationId: string, reply: string): Promise<Response> {
	const text = reply.trim() || NOT_CONNECTED;
	await storeKlioLine(conversationId, text);
	return new Response(sseFromReply(text), { headers: sseHeaders });
}

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ message: 'Sign in to talk to Klio.' }, { status: 401 });
	}
	const open = await findOpenConversation(locals.user.id, getActiveDbTarget());
	const lines: StoredKlioLine[] = open ? await listLines(open.id) : [];
	return json({ lines });
};

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

	const datasetName = getActiveDbTarget();

	if (isNewChat(body)) {
		await startNewConversation(locals.user.id, datasetName);
		return json({ lines: [] });
	}

	const message = asMessage(body);
	if (!message) {
		return json({ klio: 'error', reply: 'message required' }, { status: 400 });
	}

	const conversation = await openConversation(locals.user.id, datasetName);
	const prior = await listLines(conversation.id);
	await appendLine(conversation.id, 'user', message);

	const upstream = resolveKlioUpstreamUrl(await readKlioBlock(), resolveKickagentApiBaseUrl());
	if (!upstream) {
		return replyAndStore(conversation.id, NOT_CONNECTED);
	}

	let opsDatabase;
	try {
		opsDatabase = await resolveOpsDatabase({
			user: locals.user,
			datasetName
		});
	} catch (err) {
		const reason = err instanceof Error ? err.message : NOT_CONNECTED;
		return replyAndStore(conversation.id, reason);
	}

	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		Accept: 'text/event-stream'
	};
	const token =
		env.KICKAGENT_SERVICE_TOKEN?.trim() || process.env.KICKAGENT_SERVICE_TOKEN?.trim();
	if (token) headers.Authorization = `Bearer ${token}`;

	try {
		const res = await fetch(upstream, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				message,
				transcript: prior.map((line) => ({ role: line.role, text: line.text })),
				context: asContext(body),
				stream: true,
				userId: locals.user.id,
				userEmail: locals.user.email,
				opsDatabase
			})
		});
		const contentType = res.headers.get('content-type') ?? '';
		if (contentType.includes('text/event-stream') && res.body) {
			return streamAndStore(res.body, conversation.id, res.status);
		}
		const payload = (await res.json().catch(() => null)) as { reply?: unknown } | null;
		const reply =
			payload && typeof payload.reply === 'string' && payload.reply.trim()
				? payload.reply.trim()
				: NOT_CONNECTED;
		return replyAndStore(conversation.id, reply);
	} catch {
		return replyAndStore(conversation.id, NOT_CONNECTED);
	}
};
