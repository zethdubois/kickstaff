/** Manifest `resources` cached after plugin reload (client-only). */

import type { CommandPresentationFieldType } from './contracts';

export type ManifestFilterMatch = 'substring' | 'wildcard' | 'exact' | 'range' | 'date';

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

export type ManifestUnitsResource = {
	version: number;
	list: ManifestUnitsListResource;
	detail?: ManifestUnitsDetailResource;
	update?: ManifestUnitsUpdateResource;
};

/** Shared list shape for presentationRef resolution (`units.list`, `gl.list`). */
export type ManifestListSchema = {
	command: string;
	primaryKey: string;
	rowsKey: string;
	columns: ManifestResourceColumn[];
};

/** Chart of accounts list. v1 has no filters, sortKeys, or defaultLimit. */
export type ManifestGlListResource = ManifestListSchema;

export type ManifestGlDetailResource = {
	command: string;
	titleKey: string;
	submitCommand: string;
};

export type ManifestGlUpdateResource = {
	command: string;
	editableFields: string[];
};

export type ManifestGlResource = {
	version: number;
	list: ManifestGlListResource;
	detail: ManifestGlDetailResource;
	update: ManifestGlUpdateResource;
};

export type ManifestResources = {
	units: ManifestUnitsResource;
	/** Present when the manifest publishes `resources.gl`. Units-only manifests stay valid. */
	gl?: ManifestGlResource;
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

export function getUnitsListSchema(): ManifestUnitsListResource | null {
	return cached?.units.list ?? null;
}

export function getUnitsDetailSchema(): ManifestUnitsDetailResource | null {
	return cached?.units.detail ?? null;
}

export function getGlListSchema(): ManifestGlListResource | null {
	return cached?.gl?.list ?? null;
}

export function getGlDetailSchema(): ManifestGlDetailResource | null {
	return cached?.gl?.detail ?? null;
}

export function getGlUpdateSchema(): ManifestGlUpdateResource | null {
	return cached?.gl?.update ?? null;
}

export function isGlListPresentationRef(ref: string): boolean {
	const key = ref.trim().toLowerCase();
	return key === 'gl.list' || key === 'gl-list';
}

/** Resolve a list `presentationRef` to cached manifest columns (`units` or `gl`). */
export function resolvePresentationRef(ref: string): ManifestListSchema | null {
	if (!cached) return null;
	const key = ref.trim().toLowerCase();
	if (key === 'units.list' || key === 'units-list') {
		return cached.units.list;
	}
	if (key === 'gl.list' || key === 'gl-list') {
		return cached.gl?.list ?? null;
	}
	return null;
}

/** Resolve `gl.detail` to cached `resources.gl.detail` (`data.account`). */
export function resolveDetailPresentationRef(ref: string): ManifestGlDetailResource | null {
	if (!cached?.gl) return null;
	const key = ref.trim().toLowerCase();
	if (key === 'gl.detail') return cached.gl.detail;
	return null;
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
	const matches = new Set(['substring', 'wildcard', 'exact', 'range', 'date']);
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

const DEFAULT_GL_DETAIL: ManifestGlDetailResource = {
	command: 'gl-show',
	titleKey: 'name',
	submitCommand: 'gl-update'
};

const DEFAULT_GL_UPDATE: ManifestGlUpdateResource = {
	command: 'gl-update',
	editableFields: []
};

function parseGlList(raw: unknown): ManifestGlListResource | null {
	if (!raw || typeof raw !== 'object') return null;
	const o = raw as Record<string, unknown>;
	const command = typeof o.command === 'string' ? o.command.trim() : 'gl-list';
	const primaryKey = typeof o.primaryKey === 'string' ? o.primaryKey.trim() : 'id';
	const rowsKey = typeof o.rowsKey === 'string' ? o.rowsKey.trim() : 'rows';
	const columns = parseColumns(o.columns);
	if (columns.length === 0) return null;
	return { command, primaryKey, rowsKey, columns };
}

function parseGlDetail(raw: unknown): ManifestGlDetailResource | null {
	if (!raw || typeof raw !== 'object') return null;
	const o = raw as Record<string, unknown>;
	const command = typeof o.command === 'string' ? o.command.trim() : 'gl-show';
	const titleKey = typeof o.titleKey === 'string' ? o.titleKey.trim() : 'name';
	const submitCommand =
		typeof o.submitCommand === 'string' ? o.submitCommand.trim() : 'gl-update';
	return { command, titleKey, submitCommand };
}

function parseGlUpdate(raw: unknown): ManifestGlUpdateResource | null {
	if (!raw || typeof raw !== 'object') return null;
	const o = raw as Record<string, unknown>;
	const command = typeof o.command === 'string' ? o.command.trim() : 'gl-update';
	const editableFields = Array.isArray(o.editableFields)
		? o.editableFields.filter((k): k is string => typeof k === 'string' && k.trim() !== '')
		: [];
	return { command, editableFields };
}

function parseGlResource(raw: unknown): ManifestGlResource | null {
	if (!raw || typeof raw !== 'object') return null;
	const g = raw as Record<string, unknown>;
	const list = parseGlList(g.list);
	if (!list) return null;
	const version = typeof g.version === 'number' && Number.isFinite(g.version) ? g.version : 1;
	return {
		version,
		list,
		detail: parseGlDetail(g.detail) ?? DEFAULT_GL_DETAIL,
		update: parseGlUpdate(g.update) ?? DEFAULT_GL_UPDATE
	};
}

/**
 * Parse manifest `resources`.
 * Requires a valid `units.list`. Keeps `resources.gl` when its list columns parse.
 * A units-only manifest still returns the units resource.
 */
export function parseManifestResources(raw: unknown): ManifestResources | null {
	if (!raw || typeof raw !== 'object') return null;
	const o = raw as Record<string, unknown>;
	const unitsRaw = o.units;
	if (!unitsRaw || typeof unitsRaw !== 'object') return null;
	const u = unitsRaw as Record<string, unknown>;
	const list = parseUnitsList(u.list);
	if (!list) return null;
	const version = typeof u.version === 'number' && Number.isFinite(u.version) ? u.version : 1;
	const gl = parseGlResource(o.gl);
	return {
		units: {
			version,
			list,
			detail: parseUnitsDetail(u.detail) ?? DEFAULT_UNITS_DETAIL,
			update: parseUnitsUpdate(u.update) ?? DEFAULT_UNITS_UPDATE
		},
		...(gl ? { gl } : {})
	};
}
