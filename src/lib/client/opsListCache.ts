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
