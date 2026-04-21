import type { BillParser } from './types';
import { moscowUtilityParser } from './utility/moscow';

/**
 * Registry of available bill parsers, keyed by `${category}:${vendor}`.
 *
 * Add new entries here as new vendors/categories come online (e.g.
 * `'insurance:acme'`, `'tax:latah-county'`).
 */
export const billParsers: Record<string, BillParser> = {
	'utility:city-of-moscow': moscowUtilityParser
};

export function resolveBillParser(category: string, vendor: string): BillParser {
	const key = `${category}:${vendor}`;
	const parser = billParsers[key];
	if (parser) return parser;

	// Backward-compat: fall back to vendor-only match (legacy callers used to dispatch
	// by city alone). This keeps existing utility-bill rows parseable even if their
	// stored `category` somehow drifted.
	for (const [k, p] of Object.entries(billParsers)) {
		if (k.endsWith(`:${vendor}`)) return p;
	}
	throw new Error(`No parser configured for category="${category}" vendor="${vendor}"`);
}
