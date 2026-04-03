<script lang="ts">
	import RentalLandingGrid from '$lib/RentalLandingGrid.svelte';
	import { cityBySlug } from '$lib/cities';

	let { data } = $props();

	const label = cityBySlug.spt;
	const tagline = 'Mountains & Schweitzer';
</script>

<svelte:head>
	<title>{label}</title>
</svelte:head>

<div class="spt">
	<div class="spt__bg" aria-hidden="true"></div>
	<div class="spt__content">
		<RentalLandingGrid
			links={data.links}
			title={label}
			{tagline}
			theme="spt"
			listingEmbedUrl={data.listingEmbedUrl}
		/>
	</div>
</div>

<style>
	.spt {
		min-height: 100dvh;
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
