import { env } from '$env/dynamic/public';
import {
	parseManifestResources,
	type ManifestGlDetailResource,
	type ManifestGlListResource,
	type ManifestGlUpdateResource,
	type ManifestResources,
	type ManifestUnitsDetailResource,
	type ManifestUnitsListResource
} from '$lib/kickagent/manifestResourceCache';

export type KickagentManifestResourcesLoad = {
	manifestUrl: string | null;
	manifestVersion: string | null;
	/** Parsed manifest resources when fetch succeeds. */
	resources: ManifestResources | null;
	unitsList: ManifestUnitsListResource | null;
	unitsDetail: ManifestUnitsDetailResource | null;
	glList: ManifestGlListResource | null;
	glDetail: ManifestGlDetailResource | null;
	glUpdate: ManifestGlUpdateResource | null;
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
		const unitsList = resources?.units.list ?? null;
		const unitsDetail = resources?.units.detail ?? null;
		const glList = resources?.gl?.list ?? null;
		const glDetail = resources?.gl?.detail ?? null;
		const glUpdate = resources?.gl?.update ?? null;

		if (!unitsList) {
			const hint =
				manifestVersion && manifestVersion < '0.0.3'
					? `manifest v${manifestVersion} is too old — deploy kickagent ≥ 0.0.3 with resources`
					: manifestVersion
						? `manifest v${manifestVersion} has no parseable resources.units.list`
						: 'manifest missing resources.units.list';
			return emptyLoad(hint, { manifestUrl, manifestVersion });
		}

		return {
			manifestUrl,
			manifestVersion,
			resources,
			unitsList,
			unitsDetail,
			glList,
			glDetail,
			glUpdate,
			error: null
		};
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		return emptyLoad(message, { manifestUrl });
	}
}
