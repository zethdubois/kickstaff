/** Show a clock when this line starts a new command result, not on each follow-on line. */
export function showsKlogTimestamp(
	entry: { ts: number; source: string | null },
	previous: { ts: number; source: string | null } | null
): boolean {
	if (!previous) return true;
	return previous.ts !== entry.ts || previous.source !== entry.source;
}
