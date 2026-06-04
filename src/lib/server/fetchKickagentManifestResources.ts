import { env } from '$env/dynamic/public';
import {
	parseManifestResources,
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
	error: string | null;
};

/** Server-side manifest fetch for ops pages (does not depend on browser reload timing). */
export async function fetchKickagentManifestResources(): Promise<KickagentManifestResourcesLoad> {
	const manifestUrl = env.PUBLIC_KICKAGENT_MANIFEST_URL?.trim() ?? null;
	if (!manifestUrl) {
		return {
			manifestUrl: null,
			manifestVersion: null,
			resources: null,
			unitsList: null,
			unitsDetail: null,
			error: 'PUBLIC_KICKAGENT_MANIFEST_URL is not set'
		};
	}

	try {
		const res = await fetch(manifestUrl, {
			headers: { accept: 'application/json' }
		});
		if (!res.ok) {
			return {
				manifestUrl,
				manifestVersion: null,
				resources: null,
				unitsList: null,
				unitsDetail: null,
				error: `manifest fetch failed: ${res.status} ${res.statusText}`
			};
		}

		const raw = (await res.json()) as Record<string, unknown>;
		const manifestVersion =
			typeof raw.version === 'string' ? raw.version.trim() : null;
		const resources = parseManifestResources(raw.resources);
		const unitsList = resources?.units.list ?? null;
		const unitsDetail = resources?.units.detail ?? null;

		if (!unitsList) {
			const hint =
				manifestVersion && manifestVersion < '0.0.3'
					? `manifest v${manifestVersion} is too old — deploy kickagent ≥ 0.0.3 with resources`
					: manifestVersion
						? `manifest v${manifestVersion} has no parseable resources.units.list`
						: 'manifest missing resources.units.list';
			return {
				manifestUrl,
				manifestVersion,
				resources: null,
				unitsList: null,
				unitsDetail: null,
				error: hint
			};
		}

		return {
			manifestUrl,
			manifestVersion,
			resources,
			unitsList,
			unitsDetail,
			error: null
		};
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		return {
			manifestUrl,
			manifestVersion: null,
			resources: null,
			unitsList: null,
			unitsDetail: null,
			error: message
		};
	}
}
