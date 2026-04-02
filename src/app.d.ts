// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: {
				id: string;
				email: string;
				role: string;
				mustChangePassword: boolean;
			} | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

declare module '$env/dynamic/public' {
	export const env: {
		PUBLIC_VANITY_HOST_CDA?: string;
		PUBLIC_VANITY_HOST_MOS?: string;
		PUBLIC_VANITY_HOST_SPT?: string;
		/** AppFolio deep links for /cda — copy from browser after setting filters on kickasset.appfolio.com/listings */
		PUBLIC_APPFOLIO_CDA_SHORT_TERM_URL?: string;
		PUBLIC_APPFOLIO_CDA_LONG_TERM_URL?: string;
		PUBLIC_APPFOLIO_CDA_APPLY_URL?: string;
		PUBLIC_APPFOLIO_CDA_CONTACT_URL?: string;
		PUBLIC_APPFOLIO_MOS_SHORT_TERM_URL?: string;
		PUBLIC_APPFOLIO_MOS_LONG_TERM_URL?: string;
		PUBLIC_APPFOLIO_MOS_APPLY_URL?: string;
		PUBLIC_APPFOLIO_MOS_CONTACT_URL?: string;
		PUBLIC_APPFOLIO_SPT_SHORT_TERM_URL?: string;
		PUBLIC_APPFOLIO_SPT_LONG_TERM_URL?: string;
		PUBLIC_APPFOLIO_SPT_APPLY_URL?: string;
		PUBLIC_APPFOLIO_SPT_CONTACT_URL?: string;
	};
}

export {};
