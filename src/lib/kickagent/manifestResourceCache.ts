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
};

export type ManifestUnitsListResource = {
	command: string;
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
	submitCommand: string;
};

export type ManifestUnitsUpdateResource = {
	command: string;
	editableFields: string[];
};

/** Units v1 leftover — keep until kickagent lifts units to list-detail. */
export type ManifestUnitsResource = {
	version: number;
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
};

export type ManifestListDetailList = ManifestListSchema & {
	filters: ManifestListFilter[];
	defaultLimit?: number;
	sortKeys?: string[];
};

export type ManifestListDetailDetail = {
	command: string;
	titleKey: string;
	recordKey: string;
	submitCommand: string;
	fields: ManifestListDetailField[];
};

export type ManifestListDetailUpdate = {
	command: string;
	editableFields: string[];
	fields: Array<{ key: string; flag: string }>;
};

/** One `resources.<name>` block with `class: "list-detail"`. */
export type ManifestListDetailResource = {
	name: string;
	class: 'list-detail';
	version: number;
	list: ManifestListDetailList;
	detail: ManifestListDetailDetail;
	update: ManifestListDetailUpdate;
};

export type ManifestResources = {
	/** Thin v1 path for `/ops/units` until units is lifted. */
	units: ManifestUnitsResource | null;
	/** All list-detail instances, keyed by resource name (`gl`, …). */
	listDetail: Record<string, ManifestListDetailResource>;
};

/** @deprecated Prefer `getListDetailResource('gl')`. */
export type ManifestGlListResource = ManifestListDetailList;
/** @deprecated Prefer `getListDetailResource('gl')`. */
export type ManifestGlDetailResource = ManifestListDetailDetail;
/** @deprecated Prefer `getListDetailResource('gl')`. */
export type ManifestGlUpdateResource = ManifestListDetailUpdate;

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

export function getUnitsListSchema(): ManifestUnitsListResource | null {
	return cached?.units?.list ?? null;
}

export function getUnitsDetailSchema(): ManifestUnitsDetailResource | null {
	return cached?.units?.detail ?? null;
}

export function getListDetailResource(name: string): ManifestListDetailResource | null {
	return cached?.listDetail[name] ?? null;
}

export function getGlListSchema(): ManifestListDetailList | null {
	return cached?.listDetail.gl?.list ?? null;
}

export function getGlDetailSchema(): ManifestListDetailDetail | null {
	return cached?.listDetail.gl?.detail ?? null;
}

export function getGlUpdateSchema(): ManifestListDetailUpdate | null {
	return cached?.listDetail.gl?.update ?? null;
}

export function isGlListPresentationRef(ref: string): boolean {
	const key = ref.trim().toLowerCase();
	return key === 'gl.list' || key === 'gl-list';
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
		out.push({ key, label, type: row.type });
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

function parseUnitsList(raw: unknown): ManifestUnitsListResource | null {
	if (!raw || typeof raw !== 'object') return null;
	const o = raw as Record<string, unknown>;
	const command = typeof o.command === 'string' ? o.command.trim() : 'units-list';
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
	const command = typeof o.command === 'string' ? o.command.trim() : 'units-show';
	const titleKey = typeof o.titleKey === 'string' ? o.titleKey.trim() : 'name';
	const submitCommand =
		typeof o.submitCommand === 'string' ? o.submitCommand.trim() : 'units-update';
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
	return { command, titleKey, fields, readonlyKeys, submitCommand };
}

function parseUnitsUpdate(raw: unknown): ManifestUnitsUpdateResource | null {
	if (!raw || typeof raw !== 'object') return null;
	const o = raw as Record<string, unknown>;
	const command = typeof o.command === 'string' ? o.command.trim() : 'units-update';
	const editableFields = Array.isArray(o.editableFields)
		? o.editableFields.filter((k): k is string => typeof k === 'string')
		: [];
	return { command, editableFields };
}

const DEFAULT_UNITS_DETAIL: ManifestUnitsDetailResource = {
	command: 'units-show',
	titleKey: 'name',
	fields: [],
	readonlyKeys: [],
	submitCommand: 'units-update'
};

const DEFAULT_UNITS_UPDATE: ManifestUnitsUpdateResource = {
	command: 'units-update',
	editableFields: []
};

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
		out.push({
			key,
			label: typeof row.label === 'string' ? row.label.trim() : key,
			type: row.type,
			editable: row.editable === true,
			...(flag ? { flag } : {}),
			...(options && options.length > 0 ? { options } : {}),
			...(clearValue ? { clearValue } : {})
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
	const defaultLimit =
		typeof o.defaultLimit === 'number' && Number.isFinite(o.defaultLimit)
			? o.defaultLimit
			: undefined;
	const sortKeys = Array.isArray(o.sortKeys)
		? o.sortKeys.filter((k): k is string => typeof k === 'string')
		: undefined;
	return {
		command,
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
	if (!command || !recordKey || !submitCommand || fields.length === 0) return null;
	return { command, titleKey, recordKey, submitCommand, fields };
}

function parseListDetailUpdate(
	raw: unknown,
	detail: ManifestListDetailDetail
): ManifestListDetailUpdate {
	const fallbackFields = detail.fields
		.filter((f) => f.editable && f.flag)
		.map((f) => ({ key: f.key, flag: f.flag! }));
	if (!raw || typeof raw !== 'object') {
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
			: detail.submitCommand;
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
	return {
		command,
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
	return {
		name,
		class: 'list-detail',
		version,
		list,
		detail,
		update: parseListDetailUpdate(g.update, detail)
	};
}

function parseUnitsResource(raw: unknown): ManifestUnitsResource | null {
	if (!raw || typeof raw !== 'object') return null;
	const u = raw as Record<string, unknown>;
	if (u.class === 'list-detail') return null;
	const list = parseUnitsList(u.list);
	if (!list) return null;
	const version = typeof u.version === 'number' && Number.isFinite(u.version) ? u.version : 1;
	return {
		version,
		list,
		detail: parseUnitsDetail(u.detail) ?? DEFAULT_UNITS_DETAIL,
		update: parseUnitsUpdate(u.update) ?? DEFAULT_UNITS_UPDATE
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
