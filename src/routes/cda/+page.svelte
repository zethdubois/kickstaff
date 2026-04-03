<script lang="ts">
	import RentalLandingGrid from '$lib/RentalLandingGrid.svelte';
	import { cityBySlug } from '$lib/cities';

	let { data } = $props();

	const label = cityBySlug.cda;
	const tagline = 'Lake living in North Idaho';
</script>

<svelte:head>
	<title>{label}</title>
</svelte:head>

<div class="cda">
	<div class="cda__hero">
		<RentalLandingGrid
			links={data.links}
			title={label}
			{tagline}
			theme="cda"
			listingEmbedUrl={data.listingEmbedUrl}
			landingHeroImageUrl={data.links.landingHeroImageUrl}
			landingHeadline={data.links.landingHeadline}
			landingBody={data.links.landingBody}
		/>
	</div>
</div>

<style>
	.cda {
		min-height: 100dvh;
		background:
			radial-gradient(ellipse 120% 80% at 50% -20%, rgb(186 230 253 / 0.45), transparent 55%),
			linear-gradient(165deg, #0c4a6e 0%, #075985 38%, #0369a1 100%);
		color: #ecfeff;
	}

	.cda__hero {
		width: 100%;
		padding: 0;
	}
</style>
