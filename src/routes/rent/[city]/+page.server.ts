import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { isCitySlug } from '$lib/cities';
import { listingEmbedUrlForCityLinks, loadCityAppfolioLinks } from '$lib/server/rentalLandingLoad';

export const load: PageServerLoad = async ({ params }) => {
	const slug = params.city ?? '';
	if (!isCitySlug(slug)) error(404, 'Unknown rental city');
	const links = await loadCityAppfolioLinks(slug);
	return { slug, links, listingEmbedUrl: listingEmbedUrlForCityLinks(links) };
};
