<script lang="ts">
	import { cities } from '$lib/cities';
</script>

<svelte:head>
	<title>Public web</title>
</svelte:head>

<div class="hub">
	<h1 class="hub__title">Welcome</h1>
	<p class="hub__lead">Choose an area to explore listings and local info.</p>

	<ul class="hub__list">
		{#each cities as { slug, label } (slug)}
			<li>
				<a class="hub__link" href="/{slug}">{label}</a>
			</li>
		{/each}
	</ul>
</div>

<style>
	.hub__title {
		font-size: 1.75rem;
		font-weight: 600;
		margin: 0 0 0.5rem;
		letter-spacing: -0.02em;
	}

	.hub__lead {
		margin: 0 0 1.25rem;
		color: color-mix(in srgb, currentColor 72%, transparent);
	}

	.hub__list {
		margin: 0;
		padding-left: 1.25rem;
		line-height: 1.75;
	}

	.hub__link {
		color: inherit;
		font-weight: 500;
	}

	.hub__link:hover {
		text-decoration: underline;
	}
</style>
