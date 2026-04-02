import { env } from '$env/dynamic/public';
import type { CitySlug } from '$lib/cities';

export type CityAppfolioLinks = {
	shortTerm: string | null;
	longTerm: string | null;
	apply: string | null;
	contact: string | null;
};

/** Non-empty trimmed string, or null if unset (tile should be disabled). */
function optional(v: string | undefined): string | null {
	const t = v?.trim();
	return t || null;
}

/**
 * AppFolio URLs from PUBLIC_APPFOLIO_* env vars only.
 * Missing keys → null; UI disables that tile (no default URLs).
 */
export function cityAppfolioLinks(slug: CitySlug): CityAppfolioLinks {
	switch (slug) {
		case 'cda':
			return {
				shortTerm: optional(env.PUBLIC_APPFOLIO_CDA_SHORT_TERM_URL),
				longTerm: optional(env.PUBLIC_APPFOLIO_CDA_LONG_TERM_URL),
				apply: optional(env.PUBLIC_APPFOLIO_CDA_APPLY_URL),
				contact: optional(env.PUBLIC_APPFOLIO_CDA_CONTACT_URL)
			};
		case 'mos':
			return {
				shortTerm: optional(env.PUBLIC_APPFOLIO_MOS_SHORT_TERM_URL),
				longTerm: optional(env.PUBLIC_APPFOLIO_MOS_LONG_TERM_URL),
				apply: optional(env.PUBLIC_APPFOLIO_MOS_APPLY_URL),
				contact: optional(env.PUBLIC_APPFOLIO_MOS_CONTACT_URL)
			};
		case 'spt':
			return {
				shortTerm: optional(env.PUBLIC_APPFOLIO_SPT_SHORT_TERM_URL),
				longTerm: optional(env.PUBLIC_APPFOLIO_SPT_LONG_TERM_URL),
				apply: optional(env.PUBLIC_APPFOLIO_SPT_APPLY_URL),
				contact: optional(env.PUBLIC_APPFOLIO_SPT_CONTACT_URL)
			};
	}
}
