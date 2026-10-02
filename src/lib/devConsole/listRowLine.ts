/**
 * One text line per list row, matching kickagent CLI `printOutcome`
 * (`src/cli.ts` `listRowLine`). Not used for the accounts or units pages.
 */

export function listRowLine(row: unknown): string {
	if (!row || typeof row !== "object") return String(row);
	const record = row as Record<string, unknown>;
	if (typeof record.number === "string" && typeof record.name === "string") {
		const accountType = typeof record.accountType === "string" ? record.accountType : "";
		return [record.number, record.name, accountType].filter(Boolean).join("  ");
	}
	if (typeof record.name === "string") return record.name;
	return JSON.stringify(row);
}

/** Lines for `data.rows`, or null when the outcome is not a list. */
export function listRowLines(data: unknown): string[] | null {
	if (!data || typeof data !== "object" || Array.isArray(data)) return null;
	const rows = (data as { rows?: unknown }).rows;
	if (!Array.isArray(rows)) return null;
	return rows.map(listRowLine);
}
