<script lang="ts">
	import RentalLandingGrid from '$lib/RentalLandingGrid.svelte';
	import { cityBySlug } from '$lib/cities';

	let { data } = $props();

	const label = cityBySlug.mos;
	const tagline = 'Heart of the Palouse';
</script>

<svelte:head>
	<title>{label}</title>
</svelte:head>

<div class="mos">
	<div class="mos__strip" aria-hidden="true"></div>
	<div class="mos__inner">
		<RentalLandingGrid
			links={data.links}
			title={label}
			{tagline}
			theme="mos"
			listingEmbedUrl={data.listingEmbedUrl}
			landingHeroImageUrl={data.links.landingHeroImageUrl}
			landingHeadline={data.links.landingHeadline}
			landingBody={data.links.landingBody}
		/>
	</div>
</div>

<style>
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
</style>
