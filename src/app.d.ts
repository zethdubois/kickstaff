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
	};
}

export {};
