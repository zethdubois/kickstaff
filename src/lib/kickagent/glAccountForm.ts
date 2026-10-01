import type { CommandOutcome, CommandPresentationFieldType } from './contracts';
import type { ManifestResourceColumn } from './manifestResourceCache';

export type GlFieldKind = 'string' | 'boolean' | 'link';

export type GlFieldFlag = {
	flag: string;
	kind: GlFieldKind;
};

/**
 * `gl-update` flags. `number` has no flag: the host must not offer a control that changes it.
 * Parent and offset are account numbers; an empty value is sent as `none`.
 */
export const GL_UPDATE_FLAGS: Record<string, GlFieldFlag> = {
	name: { flag: '--name', kind: 'string' },
	accountType: { flag: '--type', kind: 'string' },
	parentNumber: { flag: '--parent', kind: 'link' },
	offsetNumber: { flag: '--offset', kind: 'link' },
	availableTo: { flag: '--available-to', kind: 'string' },
	includeOnCashFlow: { flag: '--cash-flow', kind: 'boolean' },
	excludeFrom1099: { flag: '--exclude-1099', kind: 'boolean' },
	subjectToManagementFee: { flag: '--management-fee', kind: 'boolean' },
	subjectToLateFees: { flag: '--late-fees', kind: 'boolean' },
	hidden: { flag: '--hidden', kind: 'boolean' }
};

export const GL_AVAILABILITY = ['property', 'corporate', 'both'] as const;

/** Shown on detail when they are not already list columns. */
export const GL_DETAIL_EXTRA_FIELDS: ManifestResourceColumn[] = [
	{ key: 'id', label: 'Id', type: 'uuid' },
	{ key: 'offsetNumber', label: 'Offset', type: 'string' },
	{ key: 'subjectToLateFees', label: 'Late fees', type: 'boolean' },
	{ key: 'sourceSystem', label: 'Source', type: 'string' },
	{ key: 'updatedAt', label: 'Updated', type: 'datetime' }
];

export type GlDetailField = {
	key: string;
	label: string;
	type: CommandPresentationFieldType;
	editable: boolean;
};

/** List columns (manifest labels) then detail-only keys not already listed. */
export function glDetailFields(
	listColumns: readonly ManifestResourceColumn[],
	editableFields: readonly string[]
): GlDetailField[] {
	const editable = new Set(editableFields);
	const seen = new Set<string>();
	const out: GlDetailField[] = [];

	function push(field: ManifestResourceColumn): void {
		if (seen.has(field.key)) return;
		seen.add(field.key);
		const canEdit =
			field.key !== 'number' && editable.has(field.key) && field.key in GL_UPDATE_FLAGS;
		out.push({
			key: field.key,
			label: field.label,
			type: field.type,
			editable: canEdit
		});
	}

	for (const column of listColumns) push(column);
	for (const extra of GL_DETAIL_EXTRA_FIELDS) push(extra);
	return out;
}

/** Read `gl-show` / `gl-update` `data.account`. Ignores `log` for field values. */
export function accountFromShowOutcome(
	outcome: CommandOutcome
): Record<string, unknown> | null {
	if (outcome.level === 'error') return null;
	if (!outcome.data || typeof outcome.data !== 'object' || Array.isArray(outcome.data)) {
		return null;
	}
	const account = (outcome.data as Record<string, unknown>).account;
	if (!account || typeof account !== 'object' || Array.isArray(account)) return null;
	return account as Record<string, unknown>;
}

export function accountOutcomeMessage(outcome: CommandOutcome): string | null {
	if (accountFromShowOutcome(outcome)) return null;
	const log = outcome.log;
	if (!log) return 'Account not found in response.';
	const line = Array.isArray(log) ? log[0] : log;
	return line == null || line === '' ? 'Account not found in response.' : String(line);
}

export function outcomeLogText(outcome: CommandOutcome): string | null {
	const log = outcome.log;
	if (!log) return null;
	if (Array.isArray(log)) {
		const text = log.map((line) => String(line)).join('\n').trim();
		return text || null;
	}
	const text = String(log).trim();
	return text || null;
}

function blankString(value: unknown): string {
	if (value === null || value === undefined) return '';
	return String(value).trim();
}

function sameField(kind: GlFieldKind, before: unknown, after: unknown): boolean {
	if (kind === 'boolean') return (before === true) === (after === true);
	return blankString(before) === blankString(after);
}

/**
 * Args for `gl-update`. `[]` means nothing changed. `null` means the row has no id or number.
 * Only flags for changed editable fields are included. `number` is never sent as a change.
 */
export function buildGlUpdateArgs(
	account: Record<string, unknown>,
	draft: Record<string, unknown>,
	editableFields: readonly string[]
): string[] | null {
	const id = blankString(account.id);
	const number = blankString(account.number);
	if (!id && !number) return null;

	const args = id ? ['--id', id] : ['--number', number];
	let changed = false;

	for (const key of editableFields) {
		if (key === 'number') continue;
		const spec = GL_UPDATE_FLAGS[key];
		if (!spec) continue;
		if (sameField(spec.kind, account[key], draft[key])) continue;
		changed = true;
		if (spec.kind === 'boolean') {
			args.push(spec.flag, draft[key] === true ? 'true' : 'false');
			continue;
		}
		if (spec.kind === 'link') {
			const text = blankString(draft[key]);
			args.push(spec.flag, text === '' ? 'none' : text);
			continue;
		}
		args.push(spec.flag, blankString(draft[key]));
	}

	if (!changed) return [];
	return args;
}

/** Host-built `gl-list` flags. These are not part of `resources.gl.list`. */
export function buildGlListArgs(options: {
	includeHidden: boolean;
	includeRetired: boolean;
	accountType?: string;
}): string[] {
	const args: string[] = [];
	if (options.includeHidden) args.push('--include-hidden');
	if (options.includeRetired) args.push('--include-retired');
	const accountType = options.accountType?.trim();
	if (accountType) args.push('--type', accountType);
	return args;
}
