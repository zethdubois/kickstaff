<script lang="ts">
	import RentalLandingGrid from '$lib/RentalLandingGrid.svelte';
	import { cityAppfolioLinks } from '$lib/cityAppfolioLinks';
	import { cityBySlug } from '$lib/cities';

	const label = cityBySlug.mos;
	const tagline = 'Heart of the Palouse';
	const links = cityAppfolioLinks('mos');
</script>

<svelte:head>
	<title>{label}</title>
</svelte:head>

<div class="mos">
	<div class="mos__strip" aria-hidden="true"></div>
	<div class="mos__inner">
		<RentalLandingGrid {links} title={label} {tagline} theme="mos" />
	</div>
</div>

<style>
	.mos {
		min-height: min(100vh, 52rem);
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
		max-width: 38rem;
		padding: clamp(2.75rem, 9vw, 4.25rem) clamp(1.5rem, 5vw, 2.5rem) 3rem;
	}
</style>
