import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getActiveDbTarget } from '$lib/server/dbTarget';
import { listSavedPlans } from '$lib/server/klioPlans';
import {
	activateConversation,
	deleteConversation,
	listChats
} from '$lib/server/klioTranscript';

function chatId(body: unknown): string {
	if (!body || typeof body !== 'object') return '';
	const id = (body as { id?: unknown }).id;
	return typeof id === 'string' ? id.trim() : '';
}

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ message: 'Sign in to talk to Klio.' }, { status: 401 });
	}
	const datasetName = getActiveDbTarget();
	const chats = await listChats(locals.user.id, datasetName);
	const plans = await listSavedPlans(locals.user.id, datasetName);
	return json({ chats, plans });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ message: 'Sign in to talk to Klio.' }, { status: 401 });
	}
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ message: 'Invalid JSON' }, { status: 400 });
	}
	const id = chatId(body);
	if (!id) return json({ message: 'id required' }, { status: 400 });
	const lines = await activateConversation(locals.user.id, getActiveDbTarget(), id);
	if (!lines) return json({ message: 'Chat not found' }, { status: 404 });
	return json({ lines });
};

export const DELETE: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ message: 'Sign in to talk to Klio.' }, { status: 401 });
	}
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ message: 'Invalid JSON' }, { status: 400 });
	}
	const id = chatId(body);
	if (!id) return json({ message: 'id required' }, { status: 400 });
	const result = await deleteConversation(locals.user.id, getActiveDbTarget(), id);
	if (!result.deleted) return json({ message: 'Chat not found' }, { status: 404 });
	return json(result);
};
