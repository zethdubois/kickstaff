import type { CommandOutcome } from './contracts';

/** Parse `units-show` outcome `data.unit`. */
export function unitFromShowOutcome(
	outcome: CommandOutcome
): Record<string, unknown> | null {
	if (!outcome.data || typeof outcome.data !== 'object') return null;
	const unit = (outcome.data as Record<string, unknown>).unit;
	if (!unit || typeof unit !== 'object' || Array.isArray(unit)) return null;
	return unit as Record<string, unknown>;
}

export function unitShowErrorMessage(outcome: CommandOutcome): string | null {
	if (unitFromShowOutcome(outcome)) return null;
	const log = outcome.log;
	if (log) {
		const line = Array.isArray(log) ? log[0] : log;
		return String(line);
	}
	return 'Unit not found in response.';
}
