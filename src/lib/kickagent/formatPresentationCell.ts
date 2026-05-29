import type { CommandPresentationFieldType } from './contracts';

/** Format a manifest column value for display (table cells). */
export function formatPresentationCell(
	value: unknown,
	type: CommandPresentationFieldType
): string {
	if (value === null || value === undefined) return '—';
	if (type === 'money-dollars') {
		const n = Number(value);
		if (!Number.isFinite(n)) return String(value);
		return new Intl.NumberFormat(undefined, {
			style: 'currency',
			currency: 'USD',
			maximumFractionDigits: 0
		}).format(n);
	}
	if (type === 'datetime' || type === 'date') {
		const d = value instanceof Date ? value : new Date(String(value));
		if (Number.isNaN(d.getTime())) return String(value);
		return type === 'date'
			? d.toLocaleDateString()
			: d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
	}
	if (type === 'boolean') return value ? 'yes' : 'no';
	if (type === 'integer' || type === 'number') {
		const n = Number(value);
		return Number.isFinite(n) ? String(n) : String(value);
	}
	if (type === 'percent-bps') {
		const n = Number(value);
		if (!Number.isFinite(n)) return String(value);
		return `${(n / 100).toFixed(2)}%`;
	}
	if (typeof value === 'object') return JSON.stringify(value);
	return String(value);
}
