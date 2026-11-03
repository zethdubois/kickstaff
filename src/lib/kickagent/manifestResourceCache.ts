/** Manifest `resources` cached after plugin reload (client-only). */

import type { CommandPresentationFieldType } from './contracts';

export type ManifestFilterMatch =
	| 'substring'
	| 'wildcard'
	| 'exact'
	| 'range'
	| 'date'
	| 'presence';

export type ManifestListFilter = {
	key: string;
	flag: string;
	type: CommandPresentationFieldType;
	match: ManifestFilterMatch;
	label: string;
};

export type ManifestResourceColumn = {
	key: string;
	label: string;
	type: CommandPresentationFieldType;
	/** Show this column only while the presence filter with this key is checked. */
	visibleWhen?: string;
};

export type ManifestUnitsListResource = {
	command: string;
	/** Command button text (`commands[].label`). */
	label?: string;
	primaryKey: string;
	rowsKey: string;
	defaultLimit: number;
	sortKeys: string[];
	columns: ManifestResourceColumn[];
	filters: ManifestListFilter[];
};

export type ManifestUnitsDetailResource = {
	command: string;
	titleKey: string;
	fields: Array<{
		key: string;
		label: string;
		type: CommandPresentationFieldType;
		editable?: boolean;
		required?: boolean;
	}>;
	readonlyKeys: string[];
	submitCommand?: string;
};

export type ManifestUnitsUpdateResource = {
	command: string;
	/** Command button text (`commands[].label`). */
	label?: string;
	editableFields: string[];
};

/** Units v1 leftover — keep until kickagent lifts units to list-detail. */
export type ManifestUnitsResource = {
	version: number;
	/** Page heading. Absent → the resource key. */
	label?: string;
	/** Ops nav. Absent → the resource key. */
	shortLabel?: string;
	list: ManifestUnitsListResource;
	detail?: ManifestUnitsDetailResource;
	update?: ManifestUnitsUpdateResource;
};

/** Shared list columns for presentationRef resolution. */
export type ManifestListSchema = {
	command: string;
	primaryKey: string;
	rowsKey: string;
	columns: ManifestResourceColumn[];
	filters?: ManifestListFilter[];
};

/** list-detail class field (resource version ≥ 2). */
export type ManifestListDetailField = {
	key: string;
	label: string;
	type: CommandPresentationFieldType;
	editable: boolean;
	flag?: string;
	options?: string[];
	clearValue?: string;
	/**
	 * One-way boolean: lock once the saved value is `true`, and confirm before a save
	 * that sets it to `true` (see `confirmText`).
	 */
	irreversible?: boolean;
	confirmText?: string;
	/**
	 * Optional layout group. Hosts put `status` fields in a Status section
	 * (lifecycle: hide, retire) separate from ordinary attribute checkboxes.
	 */
	group?: string;
};

export type ManifestListDetailList = ManifestListSchema & {
	/** Command button text (`commands[].label`). */
	label?: string;
	filters: ManifestListFilter[];
	defaultLimit?: number;
	sortKeys?: string[];
};

export type ManifestListDetailDetail = {
	command: string;
	titleKey: string;
	recordKey: string;
	/** Absent on show-only resources (e.g. sites). */
	submitCommand?: string;
	fields: ManifestListDetailField[];
};

export type ManifestListDetailUpdate = {
	command: string;
	/** Command button text (`commands[].label`). */
	label?: string;
	editableFields: string[];
	fields: Array<{ key: string; flag: string }>;
};

/** One `resources.<name>` block with `class: "list-detail"`. */
export type ManifestListDetailResource = {
	name: string;
	class: 'list-detail';
	version: number;
	/** Page heading. Absent → the resource key. */
	label?: string;
	/** Ops nav. Absent → the resource key. */
	shortLabel?: string;
	list: ManifestListDetailList;
	detail: ManifestListDetailDetail;
	/** Absent when the resource has no save command. */
	update?: ManifestListDetailUpdate;
};

export type ManifestResources = {
	/** Thin v1 path for `/ops/units` until units is lifted. */
	units: ManifestUnitsResource | null;
	/** All list-detail instances, keyed by resource name (`gl`, …). */
	listDetail: Record<string, ManifestListDetailResource>;
};

let cached: ManifestResources | null = null;

export function setManifestResourceCache(resources: ManifestResources | null): void {
	cached = resources;
}

export function clearManifestResourceCache(): void {
	cached = null;
}

export function getManifestResources(): ManifestResources | null {
	return cached;
}

/** Resource keys present in the cache (units + list-detail names), sorted. */
export function listCachedResourceKeys(): string[] {
	if (!cached) return [];
	const keys = new Set<string>(Object.keys(cached.listDetail));
	if (cached.units) keys.add('units');
	return [...keys].sort();
}

export function getUnitsListSchema(): ManifestUnitsListResource | null {
	return cached?.units?.list ?? null;
}

export function getUnitsDetailSchema(): ManifestUnitsDetailResource | null {
	return cached?.units?.detail ?? null;
}

export function getListDetailResource(name: string): ManifestListDetailResource | null {
	return cached?.listDetail[name] ?? null;
}

function splitPresentationRef(ref: string): { name: string; kind: 'list' | 'detail' } | null {
	const key = ref.trim().toLowerCase();
	const dot = key.match(/^([a-z][a-z0-9-]*)\.(list|detail)$/);
	if (dot) return { name: dot[1]!, kind: dot[2] as 'list' | 'detail' };
	const dash = key.match(/^([a-z][a-z0-9-]*)-(list|detail)$/);
	if (dash) return { name: dash[1]!, kind: dash[2] as 'list' | 'detail' };
	return null;
}

/** Resolve a list `presentationRef` to cached list schema. */
export function resolvePresentationRef(ref: string): ManifestListSchema | null {
	if (!cached) return null;
	const parts = splitPresentationRef(ref);
	if (!parts || parts.kind !== 'list') return null;
	if (parts.name === 'units' && cached.units) return cached.units.list;
	return cached.listDetail[parts.name]?.list ?? null;
}

/** Resolve a detail `presentationRef` to list-detail detail schema. */
export function resolveDetailPresentationRef(ref: string): ManifestListDetailDetail | null {
	if (!cached) return null;
	const parts = splitPresentationRef(ref);
	if (!parts || parts.kind !== 'detail') return null;
	return cached.listDetail[parts.name]?.detail ?? null;
}

function isFieldType(v: unknown): v is CommandPresentationFieldType {
	return (
		v === 'string' ||
		v === 'number' ||
		v === 'integer' ||
		v === 'boolean' ||
		v === 'date' ||
		v === 'datetime' ||
		v === 'uuid' ||
		v === 'json' ||
		v === 'money-dollars' ||
		v === 'percent-bps'
	);
}

function parseColumns(raw: unknown): ManifestResourceColumn[] {
	if (!Array.isArray(raw)) return [];
	const out: ManifestResourceColumn[] = [];
	for (const item of raw) {
		if (!item || typeof item !== 'object') continue;
		const row = item as Record<string, unknown>;
		const key = typeof row.key === 'string' ? row.key.trim() : '';
		const label = typeof row.label === 'string' ? row.label.trim() : key;
		if (!key || !isFieldType(row.type)) continue;
		const visibleWhen =
			typeof row.visibleWhen === 'string' && row.visibleWhen.trim() !== ''
				? row.visibleWhen.trim()
				: undefined;
		out.push({ key, label, type: row.type, ...(visibleWhen ? { visibleWhen } : {}) });
	}
	return out;
}

function parseFilters(raw: unknown): ManifestListFilter[] {
	if (!Array.isArray(raw)) return [];
	const matches = new Set([
		'substring',
		'wildcard',
		'exact',
		'range',
		'date',
		'presence'
	]);
	const out: ManifestListFilter[] = [];
	for (const item of raw) {
		if (!item || typeof item !== 'object') continue;
		const row = item as Record<string, unknown>;
		const key = typeof row.key === 'string' ? row.key.trim() : '';
		const flag = typeof row.flag === 'string' ? row.flag.trim() : '';
		const label = typeof row.label === 'string' ? row.label.trim() : key;
		const match = typeof row.match === 'string' ? row.match : '';
		if (!key || !flag || !isFieldType(row.type) || !matches.has(match)) continue;
		out.push({
			key,
			flag,
			type: row.type,
			match: match as ManifestFilterMatch,
			label
		});
	}
	return out;
}

function publishedLabel(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const text = value.trim();
	return text || undefined;
}

function parseUnitsList(raw: unknown): ManifestUnitsListResource | null {
	if (!raw || typeof raw !== 'object') return null;
	const o = raw as Record<string, unknown>;
	const command = typeof o.command === 'string' ? o.command.trim() : '';
	if (!command) return null;
	const label = publishedLabel(o.label);
	const primaryKey = typeof o.primaryKey === 'string' ? o.primaryKey.trim() : 'id';
	const rowsKey = typeof o.rowsKey === 'string' ? o.rowsKey.trim() : 'rows';
	const defaultLimit =
		typeof o.defaultLimit === 'number' && Number.isFinite(o.defaultLimit)
			? o.defaultLimit
			: 50;
	const sortKeys = Array.isArray(o.sortKeys)
		? o.sortKeys.filter((k): k is string => typeof k === 'string')
		: [];
	const columns = parseColumns(o.columns);
	if (columns.length === 0) return null;
	return {
		command,
		...(label ? { label } : {}),
		primaryKey,
		rowsKey,
		defaultLimit,
		sortKeys,
		columns,
		filters: parseFilters(o.filters)
	};
}

function parseUnitsDetail(raw: unknown): ManifestUnitsDetailResource | null {
	if (!raw || typeof raw !== 'object') return null;
	const o = raw as Record<string, unknown>;
	const command = typeof o.command === 'string' ? o.command.trim() : '';
	if (!command) return null;
	const titleKey = typeof o.titleKey === 'string' ? o.titleKey.trim() : 'name';
	const submitCommand =
		typeof o.submitCommand === 'string' ? o.submitCommand.trim() : '';
	const readonlyKeys = Array.isArray(o.readonlyKeys)
		? o.readonlyKeys.filter((k): k is string => typeof k === 'string')
		: [];
	const fields: ManifestUnitsDetailResource['fields'] = [];
	if (Array.isArray(o.fields)) {
		for (const item of o.fields) {
			if (!item || typeof item !== 'object') continue;
			const row = item as Record<string, unknown>;
			const key = typeof row.key === 'string' ? row.key.trim() : '';
			if (!key || !isFieldType(row.type)) continue;
			fields.push({
				key,
				label: typeof row.label === 'string' ? row.label.trim() : key,
				type: row.type,
				editable: row.editable === true,
				required: row.required === true
			});
		}
	}
	return {
		command,
		titleKey,
		fields,
		readonlyKeys,
		...(submitCommand ? { submitCommand } : {})
	};
}

function parseUnitsUpdate(raw: unknown): ManifestUnitsUpdateResource | null {
	if (!raw || typeof raw !== 'object') return null;
	const o = raw as Record<string, unknown>;
	const command = typeof o.command === 'string' ? o.command.trim() : '';
	if (!command) return null;
	const label = publishedLabel(o.label);
	const editableFields = Array.isArray(o.editableFields)
		? o.editableFields.filter((k): k is string => typeof k === 'string')
		: [];
	return { command, ...(label ? { label } : {}), editableFields };
}

function parseListDetailFields(raw: unknown): ManifestListDetailField[] {
	if (!Array.isArray(raw)) return [];
	const out: ManifestListDetailField[] = [];
	for (const item of raw) {
		if (!item || typeof item !== 'object') continue;
		const row = item as Record<string, unknown>;
		const key = typeof row.key === 'string' ? row.key.trim() : '';
		if (!key || !isFieldType(row.type)) continue;
		const flag =
			typeof row.flag === 'string' && row.flag.trim() !== '' ? row.flag.trim() : undefined;
		const clearValue =
			typeof row.clearValue === 'string' && row.clearValue.trim() !== ''
				? row.clearValue.trim()
				: undefined;
		const options = Array.isArray(row.options)
			? row.options.filter((o): o is string => typeof o === 'string' && o.trim() !== '')
			: undefined;
		const confirmText =
			typeof row.confirmText === 'string' && row.confirmText.trim() !== ''
				? row.confirmText.trim()
				: undefined;
		const group =
			typeof row.group === 'string' && row.group.trim() !== ''
				? row.group.trim()
				: undefined;
		out.push({
			key,
			label: typeof row.label === 'string' ? row.label.trim() : key,
			type: row.type,
			editable: row.editable === true,
			...(flag ? { flag } : {}),
			...(options && options.length > 0 ? { options } : {}),
			...(clearValue ? { clearValue } : {}),
			...(row.irreversible === true ? { irreversible: true } : {}),
			...(confirmText ? { confirmText } : {}),
			...(group ? { group } : {})
		});
	}
	return out;
}

function parseListDetailList(raw: unknown): ManifestListDetailList | null {
	if (!raw || typeof raw !== 'object') return null;
	const o = raw as Record<string, unknown>;
	const command = typeof o.command === 'string' ? o.command.trim() : '';
	const primaryKey = typeof o.primaryKey === 'string' ? o.primaryKey.trim() : 'id';
	const rowsKey = typeof o.rowsKey === 'string' ? o.rowsKey.trim() : 'rows';
	const columns = parseColumns(o.columns);
	if (!command || columns.length === 0) return null;
	const label = publishedLabel(o.label);
	const defaultLimit =
		typeof o.defaultLimit === 'number' && Number.isFinite(o.defaultLimit)
			? o.defaultLimit
			: undefined;
	const sortKeys = Array.isArray(o.sortKeys)
		? o.sortKeys.filter((k): k is string => typeof k === 'string')
		: undefined;
	return {
		command,
		...(label ? { label } : {}),
		primaryKey,
		rowsKey,
		columns,
		filters: parseFilters(o.filters),
		...(defaultLimit !== undefined ? { defaultLimit } : {}),
		...(sortKeys && sortKeys.length > 0 ? { sortKeys } : {})
	};
}

function parseListDetailDetail(raw: unknown): ManifestListDetailDetail | null {
	if (!raw || typeof raw !== 'object') return null;
	const o = raw as Record<string, unknown>;
	const command = typeof o.command === 'string' ? o.command.trim() : '';
	const titleKey = typeof o.titleKey === 'string' ? o.titleKey.trim() : 'name';
	const recordKey = typeof o.recordKey === 'string' ? o.recordKey.trim() : '';
	const submitCommand = typeof o.submitCommand === 'string' ? o.submitCommand.trim() : '';
	const fields = parseListDetailFields(o.fields);
	if (!command || !recordKey || fields.length === 0) return null;
	return {
		command,
		titleKey,
		recordKey,
		fields,
		...(submitCommand ? { submitCommand } : {})
	};
}

function parseListDetailUpdate(
	raw: unknown,
	detail: ManifestListDetailDetail
): ManifestListDetailUpdate | undefined {
	const fallbackFields = detail.fields
		.filter((f) => f.editable && f.flag)
		.map((f) => ({ key: f.key, flag: f.flag! }));
	if (!raw || typeof raw !== 'object') {
		if (!detail.submitCommand) return undefined;
		return {
			command: detail.submitCommand,
			editableFields: fallbackFields.map((f) => f.key),
			fields: fallbackFields
		};
	}
	const o = raw as Record<string, unknown>;
	const command =
		typeof o.command === 'string' && o.command.trim() !== ''
			? o.command.trim()
			: detail.submitCommand ?? '';
	if (!command) return undefined;
	const editableFields = Array.isArray(o.editableFields)
		? o.editableFields.filter((k): k is string => typeof k === 'string' && k.trim() !== '')
		: fallbackFields.map((f) => f.key);
	const fields: Array<{ key: string; flag: string }> = [];
	if (Array.isArray(o.fields)) {
		for (const item of o.fields) {
			if (!item || typeof item !== 'object') continue;
			const row = item as Record<string, unknown>;
			const key = typeof row.key === 'string' ? row.key.trim() : '';
			const flag = typeof row.flag === 'string' ? row.flag.trim() : '';
			if (!key || !flag) continue;
			fields.push({ key, flag });
		}
	}
	const label = publishedLabel(o.label);
	return {
		command,
		...(label ? { label } : {}),
		editableFields,
		fields: fields.length > 0 ? fields : fallbackFields
	};
}

function parseListDetailResource(
	name: string,
	raw: unknown
): ManifestListDetailResource | null {
	if (!raw || typeof raw !== 'object') return null;
	const g = raw as Record<string, unknown>;
	if (g.class !== 'list-detail') return null;
	const version = typeof g.version === 'number' && Number.isFinite(g.version) ? g.version : 0;
	if (version < 2) return null;
	const list = parseListDetailList(g.list);
	const detail = parseListDetailDetail(g.detail);
	if (!list || !detail) return null;
	const update = parseListDetailUpdate(g.update, detail);
	const label = publishedLabel(g.label);
	const shortLabel = publishedLabel(g.shortLabel);
	return {
		name,
		class: 'list-detail',
		version,
		...(label ? { label } : {}),
		...(shortLabel ? { shortLabel } : {}),
		list,
		detail,
		...(update ? { update } : {})
	};
}

function parseUnitsResource(raw: unknown): ManifestUnitsResource | null {
	if (!raw || typeof raw !== 'object') return null;
	const u = raw as Record<string, unknown>;
	if (u.class === 'list-detail') return null;
	const list = parseUnitsList(u.list);
	if (!list) return null;
	const version = typeof u.version === 'number' && Number.isFinite(u.version) ? u.version : 1;
	const detail = parseUnitsDetail(u.detail);
	const update = parseUnitsUpdate(u.update);
	const label = publishedLabel(u.label);
	const shortLabel = publishedLabel(u.shortLabel);
	return {
		version,
		...(label ? { label } : {}),
		...(shortLabel ? { shortLabel } : {}),
		list,
		...(detail ? { detail } : {}),
		...(update ? { update } : {})
	};
}

/**
 * Parse manifest `resources`.
 * Discovers every key. `list-detail` (version ≥ 2) goes in `listDetail`.
 * Units without `class` stays on the thin v1 path when present.
 */
export function parseManifestResources(raw: unknown): ManifestResources | null {
	if (!raw || typeof raw !== 'object') return null;
	const o = raw as Record<string, unknown>;
	const listDetail: Record<string, ManifestListDetailResource> = {};
	let units: ManifestUnitsResource | null = null;

	for (const [name, block] of Object.entries(o)) {
		if (!/^[a-z][a-z0-9-]*$/.test(name)) continue;
		const ld = parseListDetailResource(name, block);
		if (ld) {
			listDetail[name] = ld;
			continue;
		}
		if (name === 'units') {
			units = parseUnitsResource(block);
		}
	}

	if (!units && Object.keys(listDetail).length === 0) return null;
	return { units, listDetail };
}
