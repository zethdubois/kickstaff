<script lang="ts">
	import { cityBySlug } from '$lib/cities';

	const label = cityBySlug.cda;
	const tagline = 'Lake living in North Idaho';
</script>

<svelte:head>
	<title>{label}</title>
</svelte:head>

<div class="cda">
	<div class="cda__hero">
		<p class="cda__eyebrow">Rentals</p>
		<h1 class="cda__title">{label}</h1>
		<p class="cda__tagline">{tagline}</p>
		<p class="cda__body">
			Browse homes and apartments near the lake and downtown. Full listings and contact options
			coming soon.
		</p>
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

	.cda__eyebrow {
		margin: 0 0 0.75rem;
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: rgb(224 242 254 / 0.85);
	}

	.cda__title {
		margin: 0 0 0.5rem;
		font-family: Georgia, 'Times New Roman', serif;
		font-size: clamp(2rem, 5.5vw, 2.85rem);
		font-weight: 400;
		letter-spacing: -0.03em;
		line-height: 1.1;
	}

	.cda__tagline {
		margin: 0 0 1.5rem;
		font-size: 1.1rem;
		color: rgb(224 242 254 / 0.92);
		font-weight: 300;
	}

	.cda__body {
		margin: 0;
		font-size: 0.98rem;
		line-height: 1.65;
		color: rgb(224 242 254 / 0.88);
	}
</style>
