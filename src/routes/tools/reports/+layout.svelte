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
