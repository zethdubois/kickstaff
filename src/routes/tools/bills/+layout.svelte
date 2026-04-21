<script lang="ts">
	import TabBar from '$lib/components/TabBar.svelte';

	let { children } = $props();

	const tabs = [
		{
			label: 'Documents',
			href: '/tools/bills',
			match: (p: string) => p === '/tools/bills' || p.startsWith('/tools/bills/documents')
		},
		{ label: 'Postings', href: '/tools/bills/postings' }
	];
</script>

<TabBar {tabs} variant="secondary" ariaLabel="Bills sections" />

{@render children()}
