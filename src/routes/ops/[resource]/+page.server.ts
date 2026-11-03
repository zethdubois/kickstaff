import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireAdmin } from '$lib/server/guards';
import { opsResourceLinks } from '$lib/kickagent/opsResources';
import { fetchKickagentManifestResources } from '$lib/server/fetchKickagentManifestResources';

const RESOURCE_NAME = /^[a-z][a-z0-9-]*$/;

export const load: PageServerLoad = async ({ locals, params }) => {
	requireAdmin(locals.user);
	const resourceName = params.resource ?? '';
	if (!RESOURCE_NAME.test(resourceName)) {
		error(404, 'Unknown resource');
	}
	const manifest = await fetchKickagentManifestResources();
	return { resourceName, manifest, opsLinks: opsResourceLinks(manifest.resources) };
};
