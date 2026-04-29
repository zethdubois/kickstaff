/**
 * @docs-order
 * 1) /home/golem/projects/publicweb/AGENTS.md
 * 2) /home/golem/projects/publicweb/docs/guides/tools-architecture.md
 * 3) /home/golem/projects/publicweb/docs/guides/tools-ui-map.md
 */
import { redirect } from '@sveltejs/kit';

export const load = () => {
	throw redirect(302, '/tools/bills');
};
