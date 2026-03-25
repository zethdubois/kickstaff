<script lang="ts">
	import { cityBySlug } from '$lib/cities';

	const label = cityBySlug.mos;
</script>

<svelte:head>
	<title>{label}</title>
</svelte:head>

<h1>{label}</h1>
<p>Content for this area will go here.</p>
