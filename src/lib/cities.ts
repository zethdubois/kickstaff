export type CitySlug = 'cda' | 'mos' | 'spt';

export const cities: { slug: CitySlug; label: string }[] = [
	{ slug: 'cda', label: "Coeur d'Alene" },
	{ slug: 'mos', label: 'Moscow' },
	{ slug: 'spt', label: 'Sandpoint' }
];

export const cityBySlug: Record<CitySlug, string> = Object.fromEntries(
	cities.map(({ slug, label }) => [slug, label])
) as Record<CitySlug, string>;
