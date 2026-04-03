import type { PageServerLoad } from './$types';
import { listingEmbedUrlForCityLinks, loadCityAppfolioLinks } from '$lib/server/rentalLandingLoad';

export const load: PageServerLoad = async () => {
	const links = await loadCityAppfolioLinks('mos');
	return { links, listingEmbedUrl: listingEmbedUrlForCityLinks(links) };
};
