<script lang="ts">
	import { cityBySlug } from '$lib/cities';

	const label = cityBySlug.mos;
	const tagline = 'Heart of the Palouse';
</script>

<svelte:head>
	<title>{label}</title>
</svelte:head>

<div class="mos">
	<div class="mos__strip" aria-hidden="true"></div>
	<div class="mos__inner">
		<h1 class="mos__title">{label}</h1>
		<p class="mos__tagline">{tagline}</p>
		<p class="mos__body">
			Find rentals near campus and the rolling hills. Listing details and inquiry forms will appear
			here.
		</p>
		<div class="mos__card">
			<p class="mos__cardText">Property listings</p>
			<p class="mos__cardHint">Coming soon</p>
		</div>
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

	.mos__title {
		margin: 0 0 0.35rem;
		font-size: clamp(2.1rem, 5vw, 2.75rem);
		font-weight: 800;
		letter-spacing: -0.04em;
		line-height: 1.05;
		text-transform: uppercase;
	}

	.mos__tagline {
		margin: 0 0 1.5rem;
		font-size: 1.05rem;
		font-weight: 500;
		color: #57534e;
	}

	.mos__body {
		margin: 0 0 1.75rem;
		font-size: 1rem;
		line-height: 1.65;
		color: #44403c;
	}

	.mos__card {
		border: 1px solid #d6d3d1;
		border-radius: 0.5rem;
		padding: 1.25rem 1.35rem;
		background: #fff;
		box-shadow: 0 1px 2px rgb(0 0 0 / 0.06);
	}

	.mos__cardText {
		margin: 0 0 0.25rem;
		font-weight: 600;
		font-size: 0.95rem;
	}

	.mos__cardHint {
		margin: 0;
		font-size: 0.85rem;
		color: #78716c;
	}
</style>
