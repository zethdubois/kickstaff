/**
 * Generic list-detail helpers (manifest `class: "list-detail"`).
 * No resource-name constants — flags and clearValue come from the schema.
 */

import type { CommandOutcome } from './contracts';
import type {
	ManifestListDetailDetail,
	ManifestListDetailField,
	ManifestListFilter
} from './manifestResourceCache';

export type ListFilterValues = Record<string, string | boolean>;

/** Build CLI args from `list.filters` + control values. */
export function buildListFilterArgs(
	filters: readonly ManifestListFilter[],
	values: ListFilterValues
): string[] {
	const args: string[] = [];
	for (const filter of filters) {
		const raw = values[filter.key];
		if (filter.match === 'presence') {
			if (raw === true) args.push(filter.flag);
			continue;
		}
		const text = raw == null ? '' : String(raw).trim();
		if (!text) continue;
		args.push(filter.flag, text);
	}
	return args;
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

/** Read `outcome.data[recordKey]`. Ignores log for field values. */
export function recordFromShowOutcome(
	outcome: CommandOutcome,
	recordKey: string
): Record<string, unknown> | null {
	if (outcome.level === 'error') return null;
	if (!outcome.data || typeof outcome.data !== 'object' || Array.isArray(outcome.data)) {
		return null;
	}
	const record = (outcome.data as Record<string, unknown>)[recordKey];
	if (!record || typeof record !== 'object' || Array.isArray(record)) return null;
	return record as Record<string, unknown>;
}

export function recordOutcomeMessage(
	outcome: CommandOutcome,
	recordKey: string
): string | null {
	if (recordFromShowOutcome(outcome, recordKey)) return null;
	return outcomeLogText(outcome) ?? 'Record not found in response.';
}

function blankString(value: unknown): string {
	if (value === null || value === undefined) return '';
	return String(value).trim();
}

function sameValue(field: ManifestListDetailField, before: unknown, after: unknown): boolean {
	if (field.type === 'boolean') return (before === true) === (after === true);
	return blankString(before) === blankString(after);
}

/**
 * Identity flags (`editable: false` with `flag`, preferring `--id` then `--number`)
 * plus changed editable field flags only.
 * `[]` = nothing changed. `null` = no identity.
 */
export function buildListDetailUpdateArgs(
	record: Record<string, unknown>,
	draft: Record<string, unknown>,
	detail: ManifestListDetailDetail
): string[] | null {
	const identity =
		detail.fields.find((f) => !f.editable && f.flag === '--id') ??
		detail.fields.find((f) => !f.editable && f.flag === '--number') ??
		detail.fields.find((f) => !f.editable && f.flag);
	if (!identity?.flag) return null;
	const identityValue = blankString(record[identity.key]);
	if (!identityValue) return null;

	const args = [identity.flag, identityValue];
	let changed = false;

	for (const field of detail.fields) {
		if (!field.editable || !field.flag) continue;
		if (sameValue(field, record[field.key], draft[field.key])) continue;
		changed = true;
		if (field.type === 'boolean') {
			args.push(field.flag, draft[field.key] === true ? 'true' : 'false');
			continue;
		}
		const text = blankString(draft[field.key]);
		if (text === '' && field.clearValue !== undefined) {
			args.push(field.flag, field.clearValue);
			continue;
		}
		args.push(field.flag, text);
	}

	if (!changed) return [];
	return args;
}
