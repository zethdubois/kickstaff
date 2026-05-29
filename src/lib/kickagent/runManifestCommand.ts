import type { CommandOutcome } from './contracts';

/** Run a kickagent catalog command via the admin API (server-side execution). */
export async function runManifestCommand(
	command: string,
	args: string[] = []
): Promise<CommandOutcome> {
	const res = await fetch('/api/kickagent/run', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ command, args })
	});

	const payload = (await res.json().catch(() => ({}))) as {
		outcome?: CommandOutcome;
		message?: string;
	};

	if (!res.ok) {
		throw new Error(payload.message ?? `kickagent run failed (${res.status})`);
	}

	return payload.outcome ?? {};
}
