import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getActiveDbTarget } from '$lib/server/dbTarget';
import {
	cancelPlan,
	confirmPlan,
	dismissSavedPlan,
	openSavedPlan,
	savePlan
} from '$lib/server/klioPlans';

function planId(body: unknown): string {
	if (!body || typeof body !== 'object') return '';
	const id = (body as { id?: unknown }).id;
	return typeof id === 'string' ? id.trim() : '';
}

function actionOf(body: unknown): string {
	if (!body || typeof body !== 'object') return '';
	const action = (body as { action?: unknown }).action;
	return typeof action === 'string' ? action : '';
}

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
	const id = planId(body);
	const action = actionOf(body);
	if (!id) return json({ message: 'id required' }, { status: 400 });

	const datasetName = getActiveDbTarget();
	const userId = locals.user.id;

	if (action === 'save') {
		const ok = await savePlan(userId, datasetName, id);
		if (!ok) return json({ message: 'That plan is no longer pending.' }, { status: 409 });
		return json({ plan: null });
	}
	if (action === 'cancel') {
		const ok = await cancelPlan(userId, datasetName, id);
		if (!ok) return json({ message: 'That plan is no longer pending.' }, { status: 409 });
		return json({ plan: null });
	}
	if (action === 'dismiss') {
		const ok = await dismissSavedPlan(userId, datasetName, id);
		if (!ok) return json({ message: 'Saved plan not found' }, { status: 404 });
		return json({ plan: null });
	}
	if (action === 'open') {
		const plan = await openSavedPlan(userId, datasetName, id);
		if (!plan) return json({ message: 'Saved plan not found' }, { status: 404 });
		return json({ plan });
	}
	if (action === 'confirm') {
		const result = await confirmPlan(locals.user, datasetName, id);
		if ('message' in result) return json({ message: result.message }, { status: 409 });
		return json(result);
	}
	return json({ message: 'action required' }, { status: 400 });
};
