/**
 * In-memory ops lists, one snapshot per resource, plus one detail record per
 * opened id. A later visit with the same dataset and server args paints the
 * list instead of calling Kickagent again. A detail paints until a write or a
 * newer list row disagrees with it. Not written to localStorage.
 * Switching database (`app.db`) clears both.
 */
import type { ResourceTableModel } from '$lib/kickagent/outcomeToTableModel';
import { mergeDetailRecord, opsListQueryKey, patchListModel, staleDetailIds } from './opsListCache';

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
/** Bumps when a resource's details change, so an open pane can follow. */
let detailEpochs = $state<Record<string, number>>({});

function bumpDetailEpoch(resource: string): void {
	detailEpochs[resource] = (detailEpochs[resource] ?? 0) + 1;
}

/** Generation for one resource's detail book. `0` until the first change. */
export function opsDetailEpoch(resource: string): number {
	return detailEpochs[resource] ?? 0;
}

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
	const book = details[resource];
	if (!book || book.dataset !== dataset) return;
	const stale = staleDetailIds(book.records, model.rows, model.primaryKey);
	if (stale.length === 0) return;
	const records = { ...book.records };
	for (const id of stale) delete records[id];
	details[resource] = { dataset, records };
	bumpDetailEpoch(resource);
}

export function patchOpsListRow(
	resource: string,
	dataset: string,
	record: Record<string, unknown>
): void {
	const entry = entries[resource];
	if (entry && entry.dataset === dataset) {
		const next = patchListModel(entry.model, record);
		if (next !== entry.model) entries[resource] = { ...entry, model: next };
	}
	const book = details[resource];
	if (!book || book.dataset !== dataset) return;
	const primaryKey = entry?.dataset === dataset ? entry.model.primaryKey : 'id';
	const raw = record[primaryKey];
	if (raw == null || raw === '') return;
	const id = String(raw);
	const existing = book.records[id];
	if (!existing) return;
	const merged = mergeDetailRecord(existing, record);
	if (merged === existing) return;
	details[resource] = { dataset, records: { ...book.records, [id]: merged } };
	bumpDetailEpoch(resource);
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
	bumpDetailEpoch(resource);
}

/**
 * Drop one cached detail, or every detail for the resource when `id` is null.
 * A dataset that does not match the book is left alone. A null dataset means
 * the active book, which is the only copy kept for that resource.
 */
export function invalidateOpsDetails(
	resource: string,
	dataset: string | null,
	id: string | null
): void {
	const book = details[resource];
	if (!book) return;
	if (dataset && book.dataset !== dataset) return;
	if (id) {
		if (!(id in book.records)) return;
		const records = { ...book.records };
		delete records[id];
		details[resource] = { dataset: book.dataset, records };
		bumpDetailEpoch(resource);
		return;
	}
	if (Object.keys(book.records).length === 0) return;
	details[resource] = { dataset: book.dataset, records: {} };
	bumpDetailEpoch(resource);
}

export function clearOpsListCache(): void {
	entries = {};
	details = {};
	detailEpochs = {};
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
