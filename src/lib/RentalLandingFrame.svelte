<script lang="ts">
	import type { CitySlug } from '$lib/cities';

	let {
		theme,
		heroImageUrl = null,
		headline = null,
		body = null
	}: {
		theme: CitySlug;
		/** Optional full URL for hero / background (HTTPS or site-relative). */
		heroImageUrl?: string | null;
		headline?: string | null;
		/** Plain text; line breaks preserved. */
		body?: string | null;
	} = $props();

	const hasHero = $derived(Boolean(heroImageUrl?.trim()));
	const heroUrl = $derived(heroImageUrl?.trim() ?? '');
	const hasHeadline = $derived(Boolean(headline?.trim()));
	const hasBody = $derived(Boolean(body?.trim()));
	const hasEditorial = $derived(hasHero || hasHeadline || hasBody);
</script>

<div class="rentalLandingFrame">
	{#if hasHero}
		<div
			class="rentalLandingFrame__hero"
			style:background-image={`url(${JSON.stringify(heroUrl)})`}
			aria-hidden="true"
		></div>
	{/if}

	<div class="rentalLandingFrame__main">
		{#if hasHeadline}
			<h2 class="rentalLandingFrame__headline">{headline!.trim()}</h2>
		{/if}
		{#if hasBody}
			<div class="rentalLandingFrame__body">{body!.trim()}</div>
		{/if}

		{#if !hasEditorial}
			<p class="rentalLandingFrame__fallback">
				No listings or links configured for this city yet. Add a property group and/or tile URLs under
				<a class="rentalLandingFrame__adminLink" href="/admin/rental-links">Admin → Rental links</a>.
			</p>
		{/if}
	</div>
</div>

<style>
	.rentalLandingFrame {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: 0;
		min-height: 12rem;
		overflow: auto;
	}

	.rentalLandingFrame__hero {
		flex-shrink: 0;
		min-height: clamp(10rem, 28vh, 18rem);
		background-size: cover;
		background-position: center;
		background-repeat: no-repeat;
	}

	.rentalLandingFrame__main {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: clamp(1.25rem, 3vw, 2rem);
		box-sizing: border-box;
	}

	.rentalLandingFrame__headline {
		margin: 0;
		font-size: clamp(1.25rem, 2.5vw, 1.65rem);
		font-weight: 650;
		line-height: 1.2;
		letter-spacing: -0.02em;
	}

	.rentalLandingFrame__body {
		margin: 0;
		font-size: 1rem;
		line-height: 1.55;
		white-space: pre-line;
	}

	.rentalLandingFrame__fallback {
		margin: 0;
		max-width: 28rem;
		font-size: 0.95rem;
		line-height: 1.5;
		text-align: center;
		align-self: center;
	}

	.rentalLandingFrame__adminLink {
		font-weight: 650;
		text-decoration: underline;
		text-underline-offset: 0.15em;
	}

	/* Theme tokens mirror `.rentalLanding__embedEmpty` / sidebar palettes — nested under parent `.rentalLanding--{theme}`. */
	:global(.rentalLanding--cda) .rentalLandingFrame {
		background: rgb(15 23 42 / 0.25);
	}

	:global(.rentalLanding--cda) .rentalLandingFrame__headline {
		font-family: Georgia, 'Times New Roman', serif;
		font-weight: 400;
		color: #ecfeff;
	}

	:global(.rentalLanding--cda) .rentalLandingFrame__body {
		color: rgb(224 242 254 / 0.92);
		font-weight: 300;
	}

	:global(.rentalLanding--cda) .rentalLandingFrame__fallback {
		color: rgb(224 242 254 / 0.88);
	}

	:global(.rentalLanding--cda) .rentalLandingFrame__adminLink {
		color: rgb(224 242 254 / 0.95);
	}

	:global(.rentalLanding--cda) .rentalLandingFrame__hero {
		border-bottom: 1px solid rgb(186 230 253 / 0.15);
	}

	:global(.rentalLanding--spt) .rentalLandingFrame {
		background: rgb(15 23 42 / 0.35);
	}

	:global(.rentalLanding--spt) .rentalLandingFrame__headline {
		font-weight: 300;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: #ecfdf5;
		font-size: clamp(1.2rem, 2.4vw, 1.5rem);
	}

	:global(.rentalLanding--spt) .rentalLandingFrame__body {
		font-size: 0.95rem;
		font-weight: 500;
		letter-spacing: 0.04em;
		color: rgb(236 253 245 / 0.92);
	}

	:global(.rentalLanding--spt) .rentalLandingFrame__fallback {
		color: rgb(236 253 245 / 0.88);
	}

	:global(.rentalLanding--spt) .rentalLandingFrame__adminLink {
		color: rgb(167 243 208 / 0.98);
	}

	:global(.rentalLanding--spt) .rentalLandingFrame__hero {
		border-bottom: 1px solid rgb(167 243 208 / 0.12);
	}

	:global(.rentalLanding--mos) .rentalLandingFrame {
		background: #faf7f2;
	}

	:global(.rentalLanding--mos) .rentalLandingFrame__headline {
		font-weight: 800;
		letter-spacing: -0.03em;
		text-transform: uppercase;
		color: #292524;
		font-size: clamp(1.35rem, 2.8vw, 1.85rem);
	}

	:global(.rentalLanding--mos) .rentalLandingFrame__body {
		font-weight: 500;
		color: #57534e;
	}

	:global(.rentalLanding--mos) .rentalLandingFrame__fallback {
		color: #57534e;
	}

	:global(.rentalLanding--mos) .rentalLandingFrame__adminLink {
		color: #c2410c;
	}

	:global(.rentalLanding--mos) .rentalLandingFrame__hero {
		border-bottom: 1px solid #d6d3d1;
	}
</style>
