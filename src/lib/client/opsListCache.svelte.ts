/**
 * In-memory ops lists, one snapshot per resource. A later visit with the same
 * dataset and server args paints this instead of calling Kickagent again.
 * Not written to localStorage. Switching database (`app.db`) clears it.
 */
import type { ResourceTableModel } from '$lib/kickagent/outcomeToTableModel';
import { opsListQueryKey, patchListModel } from './opsListCache';

type Entry = {
	dataset: string;
	query: string;
	model: ResourceTableModel;
};

type DetailBook = {
	dataset: string;
	records: Record<string, Record<string, unknown>>;
};

let entries = $state<Record<string, Entry>>({});
let details = $state<Record<string, DetailBook>>({});

export function readOpsList(
	resource: string,
	dataset: string,
	args: readonly string[]
): ResourceTableModel | null {
	const entry = entries[resource];
	if (!entry || entry.dataset !== dataset || entry.query !== opsListQueryKey(args)) return null;
	return entry.model;
}

/** Last snapshot for this resource and dataset, even while a new query is in flight. */
export function peekOpsList(resource: string, dataset: string): ResourceTableModel | null {
	const entry = entries[resource];
	if (!entry || entry.dataset !== dataset) return null;
	return entry.model;
}

export function putOpsList(
	resource: string,
	dataset: string,
	args: readonly string[],
	model: ResourceTableModel
): void {
	entries[resource] = {
		dataset,
		query: opsListQueryKey(args),
		model
	};
}

export function patchOpsListRow(
	resource: string,
	dataset: string,
	record: Record<string, unknown>
): void {
	const entry = entries[resource];
	if (!entry || entry.dataset !== dataset) return;
	const next = patchListModel(entry.model, record);
	if (next === entry.model) return;
	entries[resource] = { ...entry, model: next };
}

export function readOpsDetail(
	resource: string,
	dataset: string,
	id: string
): Record<string, unknown> | null {
	const book = details[resource];
	if (!book || book.dataset !== dataset) return null;
	return book.records[id] ?? null;
}

export function putOpsDetail(
	resource: string,
	dataset: string,
	id: string,
	record: Record<string, unknown>
): void {
	const book = details[resource];
	const records =
		book && book.dataset === dataset ? { ...book.records, [id]: record } : { [id]: record };
	details[resource] = { dataset, records };
}

export function clearOpsListCache(): void {
	entries = {};
	details = {};
}

/** Plain snapshot for the console store viewer. Reads the live entries. */
export function opsListSnapshot(): Record<string, unknown> {
	const names = new Set([...Object.keys(entries), ...Object.keys(details)]);
	const out: Record<string, unknown> = {};
	for (const resource of [...names].sort()) {
		const entry = entries[resource];
		const book = details[resource];
		const dataset = entry?.dataset ?? book?.dataset;
		if (!dataset) continue;
		const node: Record<string, unknown> = { dataset };
		if (entry && entry.dataset === dataset) {
			node.query = entry.query ? entry.query.split('\u0000') : [];
			node.rows = entry.model.rows;
		}
		if (book && book.dataset === dataset && Object.keys(book.records).length > 0) {
			node.details = book.records;
		}
		out[resource] = node;
	}
	return out;
}
