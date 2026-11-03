import type { PageServerLoad } from './$types';
import { requireAdmin } from '$lib/server/guards';
import { opsResourceLinks } from '$lib/kickagent/opsResources';
import { fetchKickagentManifestResources } from '$lib/server/fetchKickagentManifestResources';

export const load: PageServerLoad = async ({ locals }) => {
	requireAdmin(locals.user);
	const manifest = await fetchKickagentManifestResources();
	return { manifest, opsLinks: opsResourceLinks(manifest.resources) };
};
