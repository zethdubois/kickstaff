/**
 * Per-resource list UI preferences (sort, quick filters, include-flag checkboxes).
 * Stored in `uiSettings` under `listPrefs[resourceName]`. Empty = defaults.
 */

export type ListSortDir = 'asc' | 'desc';

export type ListSort = { key: string; dir: ListSortDir };

export type ListPrefs = {
	/** Presence/text filter control values (checked checkboxes, typed text). */
	filterValues: Record<string, boolean | string>;
	/** Quick filter text above each column, keyed by column key. */
	columnFilters: Record<string, string>;
	/** `null` = default (first column ascending). */
	sort: ListSort | null;
};

export function emptyListPrefs(): ListPrefs {
	return { filterValues: {}, columnFilters: {}, sort: null };
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Drop anything that equals the default (unchecked, blank, default sort). */
export function normalizeListPrefs(input: unknown): ListPrefs {
	const out = emptyListPrefs();
	if (!isRecord(input)) return out;

	if (isRecord(input.filterValues)) {
		for (const [key, value] of Object.entries(input.filterValues)) {
			if (value === true) out.filterValues[key] = true;
			else if (typeof value === 'string' && value.trim() !== '') {
				out.filterValues[key] = value.trim();
			}
		}
	}

	if (isRecord(input.columnFilters)) {
		for (const [key, value] of Object.entries(input.columnFilters)) {
			if (typeof value === 'string' && value.trim() !== '') {
				out.columnFilters[key] = value.trim();
			}
		}
	}

	if (isRecord(input.sort)) {
		const { key, dir } = input.sort;
		if (typeof key === 'string' && key !== '' && (dir === 'asc' || dir === 'desc')) {
			out.sort = { key, dir };
		}
	}

	return out;
}

export function isEmptyListPrefs(prefs: ListPrefs): boolean {
	return (
		Object.keys(prefs.filterValues).length === 0 &&
		Object.keys(prefs.columnFilters).length === 0 &&
		prefs.sort === null
	);
}
