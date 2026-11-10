/** One server-sent event from `/api/klio`. */
export type KlioSseEvent = {
	delta?: string;
	error?: string;
	done?: boolean;
	/** Present when she proposed a write. The host stores it; the browser does not run it. */
	plan?: unknown;
};

/** Split a text/event-stream buffer. `rest` is an incomplete trailing event. */
export function takeKlioSseEvents(buffer: string): { events: KlioSseEvent[]; rest: string } {
	const parts = buffer.split('\n\n');
	const rest = parts.pop() ?? '';
	const events: KlioSseEvent[] = [];
	for (const part of parts) {
		const line = part
			.split('\n')
			.map((item) => item.trim())
			.find((item) => item.startsWith('data:'));
		if (!line) continue;
		const data = line.slice(5).trim();
		if (!data) continue;
		try {
			const parsed = JSON.parse(data) as KlioSseEvent;
			if (parsed && typeof parsed === 'object') events.push(parsed);
		} catch {
			/* ignore a non-JSON keepalive */
		}
	}
	return { events, rest };
}
