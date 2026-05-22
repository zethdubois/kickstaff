import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	ensureDashboardCommandRow,
	parseCommandKey,
	type CommandCatalogDefaults
} from '$lib/server/dashboardCommandMaterialize';

type MaterializeBody = {
	commandKey?: unknown;
	defaults?: {
		label?: unknown;
		description?: unknown;
		category?: unknown;
		sortOrder?: unknown;
		execution?: unknown;
	};
};

function parseOverride(raw: MaterializeBody['defaults']): Partial<CommandCatalogDefaults> | undefined {
	if (!raw || typeof raw !== 'object') return undefined;
	const sortRaw = raw.sortOrder;
	const sortOrder =
		sortRaw === undefined || sortRaw === null
			? undefined
			: typeof sortRaw === 'number' && Number.isFinite(sortRaw)
				? sortRaw
				: Number.parseInt(String(sortRaw), 10);
	const execution = raw.execution;
	return {
		label: typeof raw.label === 'string' ? raw.label : undefined,
		description: typeof raw.description === 'string' ? raw.description : undefined,
		category: typeof raw.category === 'string' ? raw.category : undefined,
		sortOrder: sortOrder !== undefined && Number.isFinite(sortOrder) ? sortOrder : undefined,
		execution:
			execution === 'local' || execution === 'remote' ? execution : undefined
	};
}

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ message: 'Unauthorized' }, { status: 401 });
	}
	// Kickagent commands are admin-only today; materialized cards match that scope.
	if (locals.user.role !== 'admin') {
		return json({ message: 'Forbidden' }, { status: 403 });
	}

	let body: MaterializeBody;
	try {
		body = (await request.json()) as MaterializeBody;
	} catch {
		return json({ message: 'Invalid JSON' }, { status: 400 });
	}

	const commandKey = typeof body.commandKey === 'string' ? body.commandKey : '';
	const parsed = parseCommandKey(commandKey);
	if (!parsed.ok) {
		return json({ message: parsed.message }, { status: 400 });
	}

	const result = await ensureDashboardCommandRow(parsed.key, parseOverride(body.defaults));
	if ('message' in result) {
		return json({ message: result.message }, { status: 400 });
	}

	return json({
		linkId: result.linkId,
		created: result.created
	});
};
