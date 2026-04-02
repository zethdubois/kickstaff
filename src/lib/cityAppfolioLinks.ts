import { env } from '$env/dynamic/public';
import type { CitySlug } from '$lib/cities';

const DEFAULT_LISTINGS = 'https://kickasset.appfolio.com/listings';
const DEFAULT_HOME = 'https://kickasset.appfolio.com/';
/** AppFolio property_list filter for Coeur d'Alene long-term rentals (default when env unset). */
const DEFAULT_CDA_LONG_TERM =
	'https://kickasset.appfolio.com/listings?filters%5Bproperty_list%5D=CDA';

export type CityAppfolioLinks = {
	shortTerm: string;
	longTerm: string;
	apply: string;
	contact: string;
};

function pick(v: string | undefined, fallback: string): string {
	const t = v?.trim();
	return t || fallback;
}

/** Resolved AppFolio URLs for a city; uses PUBLIC_APPFOLIO_* env vars with kickasset fallbacks. */
export function cityAppfolioLinks(slug: CitySlug): CityAppfolioLinks {
	switch (slug) {
		case 'cda':
			return {
				shortTerm: pick(env.PUBLIC_APPFOLIO_CDA_SHORT_TERM_URL, DEFAULT_LISTINGS),
				longTerm: pick(env.PUBLIC_APPFOLIO_CDA_LONG_TERM_URL, DEFAULT_CDA_LONG_TERM),
				apply: pick(env.PUBLIC_APPFOLIO_CDA_APPLY_URL, DEFAULT_LISTINGS),
				contact: pick(env.PUBLIC_APPFOLIO_CDA_CONTACT_URL, DEFAULT_HOME)
			};
		case 'mos':
			return {
				shortTerm: pick(env.PUBLIC_APPFOLIO_MOS_SHORT_TERM_URL, DEFAULT_LISTINGS),
				longTerm: pick(env.PUBLIC_APPFOLIO_MOS_LONG_TERM_URL, DEFAULT_LISTINGS),
				apply: pick(env.PUBLIC_APPFOLIO_MOS_APPLY_URL, DEFAULT_LISTINGS),
				contact: pick(env.PUBLIC_APPFOLIO_MOS_CONTACT_URL, DEFAULT_HOME)
			};
		case 'spt':
			return {
				shortTerm: pick(env.PUBLIC_APPFOLIO_SPT_SHORT_TERM_URL, DEFAULT_LISTINGS),
				longTerm: pick(env.PUBLIC_APPFOLIO_SPT_LONG_TERM_URL, DEFAULT_LISTINGS),
				apply: pick(env.PUBLIC_APPFOLIO_SPT_APPLY_URL, DEFAULT_LISTINGS),
				contact: pick(env.PUBLIC_APPFOLIO_SPT_CONTACT_URL, DEFAULT_HOME)
			};
	}
}
