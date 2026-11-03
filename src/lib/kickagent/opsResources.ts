import type { ManifestResources } from './manifestResourceCache';

/** One manifest resource that has an ops page. */
export type OpsResourceLink = {
	name: string;
	/** `resources.<name>.label`, or the key. Page heading and dashboard card. */
	label: string;
	/** `resources.<name>.shortLabel`, or the key. Ops nav. */
	shortLabel: string;
	href: string;
};

function publishedOrKey(value: string | undefined, key: string): string {
	const text = value?.trim();
	return text ? text : key;
}

/** Ops page for a resource key. `units` still resolves to its v1 route. */
export function opsResourceHref(name: string): string {
	return `/ops/${name}`;
}

/**
 * Nav and dashboard entries from a parsed manifest.
 * Units (v1) first, then list-detail resources in manifest order.
 */
export function opsResourceLinks(resources: ManifestResources | null): OpsResourceLink[] {
	if (!resources) return [];
	const names: string[] = [];
	if (resources.units) names.push('units');
	for (const name of Object.keys(resources.listDetail)) {
		if (!names.includes(name)) names.push(name);
	}
	return names.map((name) => {
		const block = name === 'units' ? resources.units : resources.listDetail[name];
		return {
			name,
			label: publishedOrKey(block?.label, name),
			shortLabel: publishedOrKey(block?.shortLabel, name),
			href: opsResourceHref(name)
		};
	});
}
