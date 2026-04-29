<!--
  @docs-order
  1) /home/golem/projects/publicweb/AGENTS.md
  2) /home/golem/projects/publicweb/docs/guides/tools-architecture.md
  3) /home/golem/projects/publicweb/docs/guides/tools-ui-map.md
-->
<script lang="ts">
	import TabBar from '$lib/components/TabBar.svelte';

	let { children } = $props();

	const tabs = [
		{
			label: 'Operations',
			href: '/tools/reports',
			match: (p: string) =>
				p === '/tools/reports' && !p.startsWith('/tools/reports/monthly')
		},
		{ label: 'Monthly', href: '/tools/reports/monthly' }
	];
</script>

<TabBar {tabs} variant="secondary" ariaLabel="Reports sections" />

{@render children()}
