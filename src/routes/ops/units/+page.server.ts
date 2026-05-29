import type { PageServerLoad } from './$types';
import { requireAdmin } from '$lib/server/guards';
import { fetchKickagentManifestResources } from '$lib/server/fetchKickagentManifestResources';

export const load: PageServerLoad = async ({ locals }) => {
	requireAdmin(locals.user);
	const manifest = await fetchKickagentManifestResources();
	return { manifest };
};
