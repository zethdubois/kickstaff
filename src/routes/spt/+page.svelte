<script lang="ts">
	import { cityBySlug } from '$lib/cities';

	const label = cityBySlug.spt;
	const tagline = 'Mountains & Schweitzer';
</script>

<svelte:head>
	<title>{label}</title>
</svelte:head>

<div class="spt">
	<div class="spt__bg" aria-hidden="true"></div>
	<div class="spt__content">
		<h1 class="spt__title">{label}</h1>
		<p class="spt__tagline">{tagline}</p>
		<p class="spt__body">
			Discover cabins and homes between the lake and the peaks. More content and search tools are on
			the way.
		</p>
	</div>
</div>

<style>
	.spt {
		min-height: min(100vh, 52rem);
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
		max-width: 34rem;
		padding: clamp(2.75rem, 9vw, 4.5rem) clamp(1.5rem, 5vw, 2.5rem) 4rem;
	}

	.spt__title {
		margin: 0 0 0.5rem;
		font-size: clamp(1.85rem, 4.5vw, 2.5rem);
		font-weight: 300;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		line-height: 1.15;
	}

	.spt__tagline {
		margin: 0 0 1.5rem;
		font-size: 0.95rem;
		font-weight: 500;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: rgb(167 243 208 / 0.9);
	}

	.spt__body {
		margin: 0;
		font-size: 1rem;
		line-height: 1.7;
		color: rgb(209 250 229 / 0.88);
	}
</style>
