import { formatPresentationCell } from './formatPresentationCell';
import type { CommandPresentationFieldType } from './contracts';
import { getManifestResources } from './manifestResourceCache';
import type { ResourceTableModel } from './outcomeToTableModel';

export type ResourceListItem = {
	key: string;
	row: Record<string, unknown>;
	label: string;
};

/** Manifest detail `titleKey` (units: `name`) or first column / primary key. */
export function resolveListLabelKey(model: ResourceTableModel): string {
	const detail = getManifestResources()?.units.detail;
	if (detail?.titleKey) return detail.titleKey;
	if (model.columns.some((c) => c.key === 'name')) return 'name';
	return model.columns[0]?.key ?? model.primaryKey;
}

function columnType(
	model: ResourceTableModel,
	key: string
): CommandPresentationFieldType {
	return model.columns.find((c) => c.key === key)?.type ?? 'string';
}

export function listItemsFromModel(
	model: ResourceTableModel,
	labelKey?: string
): ResourceListItem[] {
	const key = labelKey ?? resolveListLabelKey(model);
	const type = columnType(model, key);
	return model.rows.map((row, i) => {
		const id = row[model.primaryKey];
		return {
			key: id != null && id !== '' ? String(id) : `row-${i}`,
			row,
			label: formatPresentationCell(row[key], type)
		};
	});
}
