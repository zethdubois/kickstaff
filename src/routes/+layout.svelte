<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import favicon from '$lib/assets/favicon.svg';
	import kamHomeIcon from '$lib/assets/kam-home.svg';
	import { cities } from '$lib/cities';
	import { vanityPathForRootHost } from '$lib/vanityHosts';

	let { children } = $props();

	const isHub = $derived(page.route.id === '/');
	const isLogin = $derived(page.route.id === '/login');

	/**
	 * Vanity domains render a city route at `/` (URL stays `/`).
	 * When a public user enters via vanity host, hide the internal nav.
	 */
	const isVanityRoot = $derived(
		page.url.pathname === '/' && !!vanityPathForRootHost(page.url.hostname)
	);

	const showInternalNav = $derived(!isLogin && !isVanityRoot);

	function onCityChange(event: Event) {
		const select = event.currentTarget as HTMLSelectElement | null;
		const slug = select?.value;
		if (!slug) return;
		void goto(`/${slug}`);
		select.value = '';
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if showInternalNav}
	<header class="site-header">
		<nav class="nav" aria-label="Main">
			<a class="nav__home" href="/" aria-label="Home">
				<img class="nav__homeIcon" src={kamHomeIcon} alt="" width="24" height="24" />
			</a>

			<div class="nav__title" aria-label="Site section">Rental Sites:</div>

			<label class="nav__dropdown">
				<span class="nav__dropdownLabel">Rental Sites</span>
				<select class="nav__select" onchange={onCityChange} aria-label="Rental Sites">
					<option value="" selected disabled>Select a city…</option>
					{#each cities as { slug, label } (slug)}
						<option value={slug}>{label}</option>
					{/each}
				</select>
			</label>
		</nav>
	</header>
{/if}

<main class="main" class:main--hub={isHub} class:main--city={!isHub}>
	{@render children()}
</main>

<style>
	.site-header {
		position: sticky;
		top: 0;
		z-index: 10;
		border-bottom: 1px solid color-mix(in srgb, currentColor 12%, transparent);
		background: color-mix(in srgb, Canvas 88%, transparent);
		backdrop-filter: blur(10px);
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

	.nav__home {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border-radius: 10px;
		border: 1px solid color-mix(in srgb, currentColor 16%, transparent);
		background: color-mix(in srgb, currentColor 2%, transparent);
		color: inherit;
		text-decoration: none;
	}

	.nav__home:hover {
		background: color-mix(in srgb, currentColor 5%, transparent);
	}

	.nav__home:focus {
		outline: 2px solid color-mix(in srgb, currentColor 30%, transparent);
		outline-offset: 2px;
	}

	.nav__homeIcon {
		display: block;
	}

	.nav__title {
		font-weight: 650;
		letter-spacing: -0.01em;
		margin-right: 0.25rem;
		white-space: nowrap;
	}

	.nav__dropdown {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}

	.nav__dropdownLabel {
		font-weight: 500;
		color: color-mix(in srgb, currentColor 72%, transparent);
		white-space: nowrap;
	}

	.nav__select {
		appearance: none;
		font: inherit;
		color: inherit;
		padding: 0.35rem 2rem 0.35rem 0.65rem;
		border-radius: 10px;
		border: 1px solid color-mix(in srgb, currentColor 16%, transparent);
		background:
			linear-gradient(180deg, color-mix(in srgb, currentColor 4%, transparent), transparent),
			linear-gradient(45deg, transparent 50%, color-mix(in srgb, currentColor 55%, transparent) 50%),
			linear-gradient(135deg, color-mix(in srgb, currentColor 55%, transparent) 50%, transparent 50%),
			color-mix(in srgb, currentColor 2%, transparent);
		background-repeat: no-repeat;
		background-position:
			0 0,
			right 0.85rem top 55%,
			right 0.6rem top 55%,
			0 0;
		background-size:
			auto,
			0.5rem 0.5rem,
			0.5rem 0.5rem,
			auto;
	}

	.nav__select:focus {
		outline: 2px solid color-mix(in srgb, currentColor 30%, transparent);
		outline-offset: 2px;
	}

	.nav__select:disabled {
		opacity: 0.65;
		cursor: not-allowed;
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
