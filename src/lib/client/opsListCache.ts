/**
 * Pure helpers for the ops list cache. The live store is `opsListCache.svelte.ts`.
 * Rows stay in memory only. Filter and sort stay derived views over this snapshot.
 */
import type { ResourceTableModel } from '$lib/kickagent/outcomeToTableModel';

export function opsListQueryKey(args: readonly string[]): string {
	return args.join('\u0000');
}

export function sameRowId(left: unknown, right: unknown): boolean {
	if (left == null || right == null) return false;
	return String(left) === String(right);
}

/** Replace one row in a list snapshot. Unknown ids leave the list unchanged. */
export function patchListModel(
	model: ResourceTableModel,
	record: Record<string, unknown>
): ResourceTableModel {
	const id = record[model.primaryKey];
	if (id == null) return model;
	let changed = false;
	const rows = model.rows.map((row) => {
		if (!sameRowId(row[model.primaryKey], id)) return row;
		changed = true;
		return { ...row, ...record };
	});
	if (!changed) return model;
	return { ...model, rows };
}

/** Stored scalars that are the same record field, including `1` and `"1"`. */
export function sameStoredValue(left: unknown, right: unknown): boolean {
	if (Object.is(left, right)) return true;
	if (typeof left === 'number' && typeof right === 'string') return String(left) === right;
	if (typeof right === 'number' && typeof left === 'string') return String(right) === left;
	if (left && right && typeof left === 'object' && typeof right === 'object') {
		return JSON.stringify(left) === JSON.stringify(right);
	}
	return false;
}

/** Copy `patch` onto a cached detail. Returns the same object when nothing changed. */
export function mergeDetailRecord(
	detail: Record<string, unknown>,
	patch: Record<string, unknown>
): Record<string, unknown> {
	let changed = false;
	const next: Record<string, unknown> = { ...detail };
	for (const key of Object.keys(patch)) {
		if (key in detail && sameStoredValue(detail[key], patch[key])) continue;
		next[key] = patch[key];
		changed = true;
	}
	return changed ? next : detail;
}

/**
 * Detail ids whose shared fields disagree with the new list.
 * A row that is absent from this snapshot stays cached.
 */
export function staleDetailIds(
	records: Readonly<Record<string, Record<string, unknown>>>,
	rows: readonly Record<string, unknown>[],
	primaryKey: string
): string[] {
	const byId = new Map<string, Record<string, unknown>>();
	for (const row of rows) {
		const id = row[primaryKey];
		if (id == null || id === '') continue;
		byId.set(String(id), row);
	}
	const stale: string[] = [];
	for (const [id, detail] of Object.entries(records)) {
		const row = byId.get(id);
		if (!row) continue;
		if (sharedFieldsDiffer(detail, row)) stale.push(id);
	}
	return stale;
}

function sharedFieldsDiffer(
	detail: Record<string, unknown>,
	row: Record<string, unknown>
): boolean {
	for (const key of Object.keys(row)) {
		if (!Object.prototype.hasOwnProperty.call(detail, key)) continue;
		if (!sameStoredValue(detail[key], row[key])) return true;
	}
	return false;
}
