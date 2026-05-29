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

export type ManifestResources = {
	units: ManifestUnitsResource;
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

export function resolvePresentationRef(ref: string): ManifestUnitsListResource | null {
	if (!cached) return null;
	const key = ref.trim().toLowerCase();
	if (key === 'units.list' || key === 'units-list') {
		return cached.units.list;
	}
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

/** Parse manifest `resources` JSON (requires valid `units.list`; detail/update optional). */
export function parseManifestResources(raw: unknown): ManifestResources | null {
	if (!raw || typeof raw !== 'object') return null;
	const o = raw as Record<string, unknown>;
	const unitsRaw = o.units;
	if (!unitsRaw || typeof unitsRaw !== 'object') return null;
	const u = unitsRaw as Record<string, unknown>;
	const list = parseUnitsList(u.list);
	if (!list) return null;
	const version = typeof u.version === 'number' && Number.isFinite(u.version) ? u.version : 1;
	return {
		units: {
			version,
			list,
			detail: parseUnitsDetail(u.detail) ?? DEFAULT_UNITS_DETAIL,
			update: parseUnitsUpdate(u.update) ?? DEFAULT_UNITS_UPDATE
		}
	};
}
