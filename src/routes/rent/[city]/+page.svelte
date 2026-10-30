<!--
  @docs: docs/sop-svelte-and-components.md
  @faq: docs/guides/RentalLandingGrid.md
-->
<script lang="ts">
	import RentalLandingGrid from '$lib/RentalLandingGrid.svelte';
	import { cityBySlug, cityTaglineDefault } from '$lib/cities';

	let { data } = $props();

	const label = $derived(cityBySlug[data.slug]);
	const taglineDefault = $derived(cityTaglineDefault[data.slug]);
</script>

<svelte:head>
	<title>{label}</title>
</svelte:head>

<div class={data.slug}>
	{#if data.slug === 'mos'}
		<div class="mos__strip" aria-hidden="true"></div>
	{/if}
	{#if data.slug === 'spt'}
		<div class="spt__bg" aria-hidden="true"></div>
	{/if}
	<div
		class:cda__hero={data.slug === 'cda'}
		class:mos__inner={data.slug === 'mos'}
		class:spt__content={data.slug === 'spt'}
	>
		<RentalLandingGrid
			links={data.links}
			title={label}
			{taglineDefault}
			theme={data.slug}
			listingEmbedUrl={data.listingEmbedUrl}
			landingHeroImageUrl={data.links.landingHeroImageUrl}
			landingHeadline={data.links.landingHeadline}
			landingBody={data.links.landingBody}
		/>
	</div>
</div>

<style>
	.cda {
		min-height: calc(100dvh - var(--rental-viewport-offset, 0px));
		background:
			radial-gradient(ellipse 120% 80% at 50% -20%, rgb(186 230 253 / 0.45), transparent 55%),
			linear-gradient(165deg, #0c4a6e 0%, #075985 38%, #0369a1 100%);
		color: #ecfeff;
	}

	.cda__hero {
		width: 100%;
		padding: 0;
	}

	.mos {
		min-height: calc(100dvh - var(--rental-viewport-offset, 0px));
		background: #f5f0e8;
		color: #292524;
		position: relative;
		overflow: hidden;
	}

	.mos__strip {
		position: absolute;
		inset: 0 0 auto 0;
		height: 0.35rem;
		background: linear-gradient(90deg, #9a3412, #c2410c, #ea580c);
	}

	.mos__inner {
		width: 100%;
		padding: 0;
	}

	.spt {
		min-height: calc(100dvh - var(--rental-viewport-offset, 0px));
		background: #1c2e28;
		color: #ecfdf5;
		position: relative;
		overflow: hidden;
	}

	.spt__bg {
		position: absolute;
		inset: 0;
		background:
			radial-gradient(ellipse 90% 50% at 0% 100%, rgb(20 83 45 / 0.55), transparent 50%),
			radial-gradient(ellipse 70% 40% at 100% 0%, rgb(6 78 59 / 0.4), transparent 45%),
			linear-gradient(180deg, #0f172a 0%, #14532d 55%, #166534 100%);
		pointer-events: none;
	}

	.spt__content {
		position: relative;
		z-index: 1;
		width: 100%;
		padding: 0;
	}
</style>
