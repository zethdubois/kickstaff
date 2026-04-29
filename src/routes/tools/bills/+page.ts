/**
 * @docs-order
 * 1) /home/golem/projects/publicweb/AGENTS.md
 * 2) /home/golem/projects/publicweb/docs/guides/tools-bills-architecture.md
 * 3) /home/golem/projects/publicweb/docs/guides/tools-bills-ui-map.md
 */
import { browser } from '$app/environment';
import { getUiSettings } from '$lib/client/uiSettings.svelte';
import { redirect } from '@sveltejs/kit';

export const load = () => {
	let tab = 'transactions';
	if (browser) {
		tab = getUiSettings().billsDefaultTab;
	}
	throw redirect(302, `/tools/bills/${tab}`);
};
