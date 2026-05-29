import type { CommandOutcome } from './contracts';
import type {
	ManifestResourceColumn,
	ManifestUnitsListResource
} from './manifestResourceCache';
import { resolvePresentationRef } from './manifestResourceCache';

export type ResourceTableModel = {
	presentationRef: string;
	columns: ManifestResourceColumn[];
	primaryKey: string;
	rows: Record<string, unknown>[];
	meta: Record<string, unknown>;
};

/** Build a table model from kickagent outcome + manifest list schema (not from log). */
export function outcomeToTableModel(
	outcome: CommandOutcome,
	listSchema?: ManifestUnitsListResource | null
): ResourceTableModel | null {
	if (!outcome.data || !outcome.presentationRef) return null;
	const schema =
		listSchema ??
		resolvePresentationRef(outcome.presentationRef);
	if (!schema) return null;
	const payload = outcome.data;
	if (!payload || typeof payload !== 'object') return null;
	const rows = (payload as Record<string, unknown>)[schema.rowsKey];
	if (!Array.isArray(rows)) return null;
	return {
		presentationRef: outcome.presentationRef,
		columns: schema.columns,
		primaryKey: schema.primaryKey,
		rows: rows as Record<string, unknown>[],
		meta: payload as Record<string, unknown>
	};
}

/** User-facing hint when outcome has data ref but table cannot be built. */
export function tableOutcomeMissingHint(
	outcome: CommandOutcome,
	listSchema?: ManifestUnitsListResource | null
): string | null {
	if (!outcome.data || !outcome.presentationRef) return null;
	if (outcomeToTableModel(outcome, listSchema)) return null;
	if (!listSchema && !resolvePresentationRef(outcome.presentationRef)) {
		return 'table UI: manifest resources.units.list is not cached — run kam:reload-kickagent after kickagent ≥ 0.0.3 is deployed';
	}
	return 'table UI: response missing data.rows — check kickagent units-list returns presentationRef and rows';
}
