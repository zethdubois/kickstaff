export type CitySlug = 'cda' | 'mos' | 'spt';

export const cities: { slug: CitySlug; label: string }[] = [
	{ slug: 'cda', label: "Coeur d'Alene" },
	{ slug: 'mos', label: 'Moscow' },
	{ slug: 'spt', label: 'Sandpoint' }
];

export const cityBySlug: Record<CitySlug, string> = Object.fromEntries(
	cities.map(({ slug, label }) => [slug, label])
) as Record<CitySlug, string>;

/** Default subtitle under the city title when the database tagline is empty. */
export const cityTaglineDefault: Record<CitySlug, string> = {
	cda: 'Lake living in North Idaho',
	mos: 'Heart of the Palouse',
	spt: 'Mountains & Schweitzer'
};

/** App-host path for a city rental page. Vanity domains still serve that page at `/`. */
export function rentalPagePath(slug: CitySlug): `/rent/${CitySlug}` {
	return `/rent/${slug}`;
}

export function isCitySlug(s: string): s is CitySlug {
	return (cities as readonly { slug: CitySlug }[]).some((c) => c.slug === s);
}
