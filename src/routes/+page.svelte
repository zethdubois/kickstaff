<script lang="ts">
	import { cities } from '$lib/cities';
</script>

<svelte:head>
	<title>Public web</title>
</svelte:head>

<h1>Welcome</h1>
<p>Choose an area:</p>

<ul class="city-list">
	{#each cities as { slug, label } (slug)}
		<li>
			<a href="/{slug}">{label}</a>
		</li>
	{/each}
</ul>

<style>
	.city-list {
		margin: 1rem 0 0;
		padding-left: 1.25rem;
		line-height: 1.7;
	}

	.city-list a {
		color: inherit;
	}
</style>
