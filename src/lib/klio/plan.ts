/** A stored command. `args` is the token list Confirm runs. */
export type KlioPlanCall = { command: string; args: string[] };

/** Card payload. Saved and cancelled rows are not cards. */
export type KlioActionCard = {
	id: string;
	title: string;
	summary: string;
	calls: KlioPlanCall[];
	proposedAt: number;
	status: 'pending' | 'executed';
	executedAt: number | null;
	results: unknown[] | null;
};

/** Commands a plan is allowed to queue. Anything else is refused. */
export const KLIO_PLAN_COMMANDS = [
	'gl-update',
	'gl-hide',
	'gl-retire',
	'gl-create',
	'gl-import',
	'units-update',
	'units-import-af',
	'site-units-import-af'
] as const;

const PLAN_COMMANDS = new Set<string>(KLIO_PLAN_COMMANDS);

export function planTitle(title: string | undefined, summary: string): string {
	const named = title?.trim().replace(/\s+/g, ' ');
	if (named) return named;
	const flat = summary.trim().replace(/\s+/g, ' ');
	const sentence = flat.match(/^.*?[.!?](?=\s|$)/);
	return (sentence?.[0] ?? flat).trim() || 'plan';
}

export function callLine(call: KlioPlanCall): string {
	return [call.command, ...call.args].join(' ');
}

export function resultText(result: unknown): string {
	if (!result || typeof result !== 'object') return result == null ? '' : String(result);
	const log = (result as { log?: unknown }).log;
	if (typeof log === 'string') return log;
	if (Array.isArray(log)) return log.filter((line) => typeof line === 'string').join('\n');
	const message = (result as { message?: unknown }).message;
	if (typeof message === 'string') return message;
	return JSON.stringify(result);
}

function asCall(value: unknown): KlioPlanCall | null {
	if (!value || typeof value !== 'object') return null;
	const command = (value as { command?: unknown }).command;
	const args = (value as { args?: unknown }).args;
	if (typeof command !== 'string' || !PLAN_COMMANDS.has(command)) return null;
	if (!Array.isArray(args) || args.some((arg) => typeof arg !== 'string')) return null;
	return { command, args };
}

/**
 * A proposal Klio returned. Null when it is missing, empty, or contains a
 * command the host will not run. `reply` fills `summary` when she omits it.
 */
export function parseKlioPlan(
	value: unknown,
	reply: string
): { title: string; summary: string; calls: KlioPlanCall[] } | null {
	if (!value || typeof value !== 'object') return null;
	const rawCalls = (value as { calls?: unknown }).calls;
	if (!Array.isArray(rawCalls) || rawCalls.length === 0) return null;
	const calls: KlioPlanCall[] = [];
	for (const raw of rawCalls) {
		const call = asCall(raw);
		if (!call) return null;
		calls.push(call);
	}
	const summaryField = (value as { summary?: unknown }).summary;
	const summary =
		typeof summaryField === 'string' && summaryField.trim() ? summaryField.trim() : reply.trim();
	if (!summary) return null;
	const titleField = (value as { title?: unknown }).title;
	const title = planTitle(typeof titleField === 'string' ? titleField : undefined, summary);
	return { title, summary, calls };
}

export function isKlioActionCard(value: unknown): value is KlioActionCard {
	if (!value || typeof value !== 'object') return false;
	const row = value as Record<string, unknown>;
	return (
		typeof row.id === 'string' &&
		typeof row.title === 'string' &&
		typeof row.summary === 'string' &&
		(row.status === 'pending' || row.status === 'executed') &&
		typeof row.proposedAt === 'number' &&
		Array.isArray(row.calls)
	);
}
