<script lang="ts">
	import RentalLandingGrid from '$lib/RentalLandingGrid.svelte';
	import { cityAppfolioLinks } from '$lib/cityAppfolioLinks';
	import { cityBySlug } from '$lib/cities';

	const label = cityBySlug.cda;
	const tagline = 'Lake living in North Idaho';
	const links = cityAppfolioLinks('cda');
</script>

<svelte:head>
	<title>{label}</title>
</svelte:head>

<div class="cda">
	<div class="cda__hero">
		<RentalLandingGrid {links} title={label} {tagline} theme="cda" />
	</div>
</div>

<style>
	.cda {
		min-height: min(100vh, 52rem);
		background:
			radial-gradient(ellipse 120% 80% at 50% -20%, rgb(186 230 253 / 0.45), transparent 55%),
			linear-gradient(165deg, #0c4a6e 0%, #075985 38%, #0369a1 100%);
		color: #ecfeff;
	}

	.cda__hero {
		max-width: 36rem;
		padding: clamp(2.5rem, 8vw, 4.5rem) clamp(1.5rem, 5vw, 2.5rem) 4rem;
	}
</style>
