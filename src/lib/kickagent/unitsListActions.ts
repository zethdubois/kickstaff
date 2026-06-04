import { runManifestCommand } from './runManifestCommand';
import type { ResourceListItem } from './resourceListModel';
import type { ResourceTableModel } from './outcomeToTableModel';
import { getManifestResources } from './manifestResourceCache';

export type UnitsListAction = {
	id: string;
	label: string;
	run: (item: ResourceListItem) => void | Promise<void>;
};

export type UnitsListActionSet = {
	primary: UnitsListAction;
	secondary: UnitsListAction[];
};

async function copyText(text: string): Promise<void> {
	if (!navigator.clipboard?.writeText) {
		throw new Error('Clipboard not available');
	}
	await navigator.clipboard.writeText(text);
}

function rowId(model: ResourceTableModel, row: Record<string, unknown>): string {
	const id = row[model.primaryKey];
	if (id == null || id === '') throw new Error('Unit row has no id');
	return String(id);
}

/** Primary + secondary actions for units list keyboard UI. */
export function buildUnitsListActions(
	model: ResourceTableModel,
	opts?: {
		onShowOutcome?: (lines: string[]) => void;
		onActionMessage?: (message: string) => void;
	}
): UnitsListActionSet {
	const detailCommand =
		getManifestResources()?.units.detail?.command ?? 'units-show';

	const primary: UnitsListAction = {
		id: 'show',
		label: 'View unit',
		run: async (item) => {
			const id = rowId(model, item.row);
			const outcome = await runManifestCommand(detailCommand, ['--id', id]);
			const log = outcome.log;
			if (log) {
				const lines = Array.isArray(log) ? log.map(String) : [String(log)];
				opts?.onShowOutcome?.(lines);
			} else {
				opts?.onActionMessage?.('Unit loaded (no log lines).');
			}
		}
	};

	const secondary: UnitsListAction[] = [
		{
			id: 'copy-id',
			label: 'Copy unit ID',
			run: async (item) => {
				await copyText(rowId(model, item.row));
				opts?.onActionMessage?.('Copied unit ID.');
			}
		},
		{
			id: 'copy-name',
			label: 'Copy unit name',
			run: async (item) => {
				await copyText(item.label);
				opts?.onActionMessage?.('Copied unit name.');
			}
		}
	];

	secondary.push({
		id: 'copy-af',
		label: 'Copy AppFolio ID',
		run: async (item) => {
			const afId = item.row.appfolioPropertyId;
			if (afId == null || afId === '') {
				opts?.onActionMessage?.('No AppFolio ID on this unit.');
				return;
			}
			await copyText(String(afId));
			opts?.onActionMessage?.('Copied AppFolio ID.');
		}
	});

	secondary.push({
		id: 'copy-cmd',
		label: 'Copy KAM command',
		run: async (item) => {
			const id = rowId(model, item.row);
			await copyText(`${detailCommand} --id ${id}`);
			opts?.onActionMessage?.('Copied command.');
		}
	});

	return { primary, secondary };
}
