import { env } from '$env/dynamic/public';
import {
	parseManifestResources,
	type ManifestListDetailResource,
	type ManifestResources,
	type ManifestUnitsDetailResource,
	type ManifestUnitsListResource
} from '$lib/kickagent/manifestResourceCache';

export type KickagentManifestResourcesLoad = {
	manifestUrl: string | null;
	manifestVersion: string | null;
	resources: ManifestResources | null;
	unitsList: ManifestUnitsListResource | null;
	unitsDetail: ManifestUnitsDetailResource | null;
	glResource: ManifestListDetailResource | null;
	glList: ManifestListDetailResource['list'] | null;
	glDetail: ManifestListDetailResource['detail'] | null;
	glUpdate: ManifestListDetailResource['update'] | null;
	error: string | null;
};

function emptyLoad(
	error: string | null,
	partial: Partial<KickagentManifestResourcesLoad> = {}
): KickagentManifestResourcesLoad {
	return {
		manifestUrl: null,
		manifestVersion: null,
		resources: null,
		unitsList: null,
		unitsDetail: null,
		glResource: null,
		glList: null,
		glDetail: null,
		glUpdate: null,
		error,
		...partial
	};
}

/** Server-side manifest fetch for ops pages (does not depend on browser reload timing). */
export async function fetchKickagentManifestResources(): Promise<KickagentManifestResourcesLoad> {
	const manifestUrl = env.PUBLIC_KICKAGENT_MANIFEST_URL?.trim() ?? null;
	if (!manifestUrl) {
		return emptyLoad('PUBLIC_KICKAGENT_MANIFEST_URL is not set');
	}

	try {
		const res = await fetch(manifestUrl, {
			headers: { accept: 'application/json' }
		});
		if (!res.ok) {
			return emptyLoad(`manifest fetch failed: ${res.status} ${res.statusText}`, {
				manifestUrl
			});
		}

		const raw = (await res.json()) as Record<string, unknown>;
		const manifestVersion =
			typeof raw.version === 'string' ? raw.version.trim() : null;
		const resources = parseManifestResources(raw.resources);
		const unitsList = resources?.units?.list ?? null;
		const unitsDetail = resources?.units?.detail ?? null;
		const glResource = resources?.listDetail.gl ?? null;

		if (!resources) {
			return emptyLoad(
				manifestVersion
					? `manifest v${manifestVersion} has no parseable resources`
					: 'manifest missing resources',
				{ manifestUrl, manifestVersion }
			);
		}

		return {
			manifestUrl,
			manifestVersion,
			resources,
			unitsList,
			unitsDetail,
			glResource,
			glList: glResource?.list ?? null,
			glDetail: glResource?.detail ?? null,
			glUpdate: glResource?.update ?? null,
			error: null
		};
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		return emptyLoad(message, { manifestUrl });
	}
}
