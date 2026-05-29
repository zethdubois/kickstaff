/** Hub → full-page units list (option D). */

export const UNITS_OPS_PATH = '/ops/units';

export const UNITS_LIST_COMMAND = 'units-list';

export function isUnitsHubCommandKey(commandKey: string): boolean {
	const key = commandKey.trim().toLowerCase();
	return key === 'kickagent:units-list' || key === UNITS_LIST_COMMAND;
}
