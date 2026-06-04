import type { CommandPresentationFieldType } from './contracts';
import { formatPresentationCell } from './formatPresentationCell';

export function valueToInputString(
	value: unknown,
	type: CommandPresentationFieldType
): string {
	if (value === null || value === undefined) return '';
	if (type === 'boolean') return value ? 'true' : 'false';
	if (type === 'json' && typeof value === 'object') {
		try {
			return JSON.stringify(value, null, 2);
		} catch {
			return String(value);
		}
	}
	return String(value);
}

export function formatReadonlyField(
	value: unknown,
	type: CommandPresentationFieldType
): string {
	return formatPresentationCell(value, type);
}

export function inputTypeForField(
	type: CommandPresentationFieldType
): 'text' | 'number' | 'date' | 'datetime-local' | 'checkbox' | 'textarea' {
	switch (type) {
		case 'integer':
		case 'number':
		case 'money-dollars':
		case 'percent-bps':
			return 'number';
		case 'date':
			return 'date';
		case 'datetime':
			return 'datetime-local';
		case 'boolean':
			return 'checkbox';
		case 'json':
			return 'textarea';
		default:
			return 'text';
	}
}

export function isMultilineField(type: CommandPresentationFieldType): boolean {
	return type === 'json' || type === 'string';
}
