/**
 * Where Kickstaff posts a Klio turn. The browser never sees devOrigin or the
 * service token.
 *
 * Laptop manifest: `klio.devOrigin` + `klio.path` (http://127.0.0.1:7094/klio).
 * Staging/prod: publish origin + `/klio` when the block has no devOrigin.
 */

export type KlioManifestBlock = {
	path?: unknown;
	devOrigin?: unknown;
	commands?: unknown;
};

export function klioBlockOffersAsk(block: KlioManifestBlock | null | undefined): boolean {
	if (!block || typeof block !== 'object') return false;
	return Array.isArray(block.commands) && block.commands.includes('ask');
}

/** Upstream URL, or null when the manifest does not offer Klio. */
export function resolveKlioUpstreamUrl(
	block: KlioManifestBlock | null | undefined,
	publishOrigin: string | null
): string | null {
	if (!klioBlockOffersAsk(block)) return null;
	const path =
		typeof block!.path === 'string' && block!.path.startsWith('/') ? block!.path : '/klio';
	const dev =
		typeof block!.devOrigin === 'string' ? block!.devOrigin.trim().replace(/\/+$/, '') : '';
	if (dev) return `${dev}${path}`;
	const origin = publishOrigin?.trim().replace(/\/+$/, '') ?? '';
	if (!origin) return null;
	return `${origin}${path}`;
}
