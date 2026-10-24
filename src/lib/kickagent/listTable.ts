/**
 * Generic list table helpers: sort, quick (substring) filter, column visibility.
 * No resource-name constants — everything comes from manifest columns/filters.
 */

import { formatPresentationCell } from './formatPresentationCell';
import type { ListFilterValues } from './listDetailForm';
import type { ListSort } from './listPrefs';
import type { ManifestListFilter, ManifestResourceColumn } from './manifestResourceCache';

type Row = Record<string, unknown>;

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

const NUMERIC_TYPES = new Set(['integer', 'number', 'money-dollars', 'percent-bps']);
const DATE_TYPES = new Set(['datetime', 'date']);

/** Boolean columns have no quick filter (they read yes/no). */
export function isFilterableColumn(column: ManifestResourceColumn): boolean {
	return column.type !== 'boolean';
}

/** The sort in effect: the saved one if its column is still shown, else first column ascending. */
export function effectiveSort(
	columns: readonly ManifestResourceColumn[],
	sort: ListSort | null
): ListSort | null {
	const first = columns[0];
	if (!first) return null;
	if (sort && columns.some((c) => c.key === sort.key)) return sort;
	return { key: first.key, dir: 'asc' };
}

/**
 * Next sort after clicking a column label. Same column flips direction; another column starts
 * ascending. Returns `null` when the result is the default (first column ascending), so
 * nothing is saved for it.
 */
export function nextSort(
	columns: readonly ManifestResourceColumn[],
	current: ListSort | null,
	key: string
): ListSort | null {
	const active = effectiveSort(columns, current);
	const next: ListSort =
		active?.key === key
			? { key, dir: active.dir === 'asc' ? 'desc' : 'asc' }
			: { key, dir: 'asc' };
	const first = columns[0];
	if (first && next.key === first.key && next.dir === 'asc') return null;
	return next;
}

function isBlank(value: unknown): boolean {
	return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
}

/** Compare two non-blank values for one column type. */
export function compareCell(type: string, a: unknown, b: unknown): number {
	if (NUMERIC_TYPES.has(type)) {
		const x = Number(a);
		const y = Number(b);
		if (Number.isFinite(x) && Number.isFinite(y)) return x - y;
	} else if (DATE_TYPES.has(type)) {
		const x = Date.parse(String(a));
		const y = Date.parse(String(b));
		if (Number.isFinite(x) && Number.isFinite(y)) return x - y;
	} else if (type === 'boolean') {
		return Number(a === true) - Number(b === true);
	}
	return collator.compare(String(a), String(b));
}

/** Stable sort. Blank values always sort last, in either direction. */
export function sortRows(
	rows: readonly Row[],
	columns: readonly ManifestResourceColumn[],
	sort: ListSort | null
): Row[] {
	const column = sort ? columns.find((c) => c.key === sort.key) : undefined;
	if (!sort || !column) return [...rows];
	const sign = sort.dir === 'asc' ? 1 : -1;
	return [...rows].sort((ra, rb) => {
		const a = ra[column.key];
		const b = rb[column.key];
		const aBlank = isBlank(a);
		const bBlank = isBlank(b);
		if (aBlank || bBlank) return aBlank === bBlank ? 0 : aBlank ? 1 : -1;
		return sign * compareCell(column.type, a, b);
	});
}

function haystack(value: unknown, column: ManifestResourceColumn): string {
	if (isBlank(value)) return '';
	return `${String(value)}\n${formatPresentationCell(value, column.type)}`.toLowerCase();
}

/**
 * Quick filter: every non-blank column filter must be a case-insensitive substring of that
 * cell's raw or displayed value. Filters for columns not shown are ignored.
 */
export function filterRows(
	rows: readonly Row[],
	columns: readonly ManifestResourceColumn[],
	columnFilters: Readonly<Record<string, string>>
): Row[] {
	const active = columns
		.filter(isFilterableColumn)
		.map((column) => ({
			column,
			needle: (columnFilters[column.key] ?? '').trim().toLowerCase()
		}))
		.filter((entry) => entry.needle !== '');
	if (active.length === 0) return [...rows];
	return rows.filter((row) =>
		active.every(({ column, needle }) => haystack(row[column.key], column).includes(needle))
	);
}

/**
 * The presence filter key (`includeHidden`) that gates a column, or `null`.
 * Prefers the publisher's `column.visibleWhen`. Interim until publishers set it: a presence
 * filter `include<Name>` gates any column whose key starts with `<name>` (`hidden`, `retiredAt`).
 */
export function columnGate(
	column: ManifestResourceColumn,
	filters: readonly ManifestListFilter[]
): string | null {
	if (column.visibleWhen) return column.visibleWhen;
	const key = column.key.toLowerCase();
	for (const filter of filters) {
		if (filter.match !== 'presence') continue;
		const match = /^include(.+)$/i.exec(filter.key);
		const name = match?.[1]?.toLowerCase();
		if (name && name.length >= 3 && key.startsWith(name)) return filter.key;
	}
	return null;
}

/** Columns to show: gated columns appear only while their include filter is checked. */
export function visibleColumns(
	columns: readonly ManifestResourceColumn[],
	filters: readonly ManifestListFilter[],
	values: ListFilterValues
): ManifestResourceColumn[] {
	return columns.filter((column) => {
		const gate = columnGate(column, filters);
		return gate === null || values[gate] === true;
	});
}
