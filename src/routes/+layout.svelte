<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import favicon from '$lib/assets/favicon.svg';
	import { cities } from '$lib/cities';

	let { children } = $props();

	/** Hub nav only on the root index (`route.id === '/'`). City routes use `/cda` | `/mos` | `/spt`. */
	const showHubNav = $derived(page.route.id === '/');
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if showHubNav}
	<header class="site-header">
		<nav class="nav" aria-label="Main">
			<a class="nav__home" href="/">Home</a>
			{#each cities as { slug, label } (slug)}
				<a class="nav__city" href="/{slug}">{label}</a>
			{/each}
		</nav>
	</header>
{/if}

<main class="main" class:main--hub={showHubNav} class:main--city={!showHubNav}>
	{@render children()}
</main>

<style>
	.site-header {
		border-bottom: 1px solid color-mix(in srgb, currentColor 12%, transparent);
		padding: 0.75rem 1.25rem;
	}

	.nav {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem 1.25rem;
		max-width: 48rem;
		margin: 0 auto;
		font-size: 0.95rem;
	}

	.nav a {
		color: inherit;
		text-decoration: none;
	}

	.nav a:hover {
		text-decoration: underline;
	}

	.nav__home {
		font-weight: 600;
		margin-right: 0.25rem;
	}

	.main--hub {
		max-width: 48rem;
		margin: 0 auto;
		padding: 1.5rem 1.25rem 3rem;
	}

	.main--city {
		max-width: none;
		margin: 0;
		padding: 0;
	}
</style>
