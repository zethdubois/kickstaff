<script lang="ts">
	import type { CityAppfolioLinks } from '$lib/cityAppfolioLinks';
	import type { CitySlug } from '$lib/cities';

	let {
		links,
		title,
		tagline,
		theme
	}: {
		links: CityAppfolioLinks;
		title: string;
		tagline: string;
		theme: CitySlug;
	} = $props();

</script>

<div class="rentalLanding rentalLanding--{theme}">
	<header class="rentalLanding__header">
		{#if theme === 'cda'}
			<p class="rentalLanding__eyebrow">Rentals</p>
		{/if}
		<h1 class="rentalLanding__title">{title}</h1>
		<p class="rentalLanding__tagline">{tagline}</p>
	</header>

	<nav class="rentalLanding__grid" aria-label="Rental links">
		<a
			class="rentalLanding__tile"
			href={links.shortTerm}
			target="_blank"
			rel="noopener noreferrer"
			aria-label="Short-term rentals (opens in new tab)"
		>
			<span class="rentalLanding__icon" aria-hidden="true">
				<svg class="rentalLanding__iconSvg" viewBox="0 0 24 24">
					<path
						fill="currentColor"
						d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"
					/>
				</svg>
			</span>
			<span class="rentalLanding__label">Short-term rentals</span>
		</a>
		<a
			class="rentalLanding__tile"
			href={links.longTerm}
			target="_blank"
			rel="noopener noreferrer"
			aria-label="Long-term rentals (opens in new tab)"
		>
			<span class="rentalLanding__icon" aria-hidden="true">
				<svg class="rentalLanding__iconSvg" viewBox="0 0 24 24">
					<path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8h5z" />
				</svg>
			</span>
			<span class="rentalLanding__label">Long-term rentals</span>
		</a>
		<a
			class="rentalLanding__tile"
			href={links.apply}
			target="_blank"
			rel="noopener noreferrer"
			aria-label="Apply today (opens in new tab)"
		>
			<span class="rentalLanding__icon" aria-hidden="true">
				<svg class="rentalLanding__iconSvg" viewBox="0 0 24 24">
					<path
						fill="currentColor"
						d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11zM8 15.01l1.41 1.41L11 14.83V22h2v-7.17l1.59 1.59L16 15.01 12.01 11 8 15.01z"
					/>
				</svg>
			</span>
			<span class="rentalLanding__label">Apply today</span>
		</a>
		<a
			class="rentalLanding__tile"
			href={links.contact}
			target="_blank"
			rel="noopener noreferrer"
			aria-label="Contact us (opens in new tab)"
		>
			<span class="rentalLanding__icon" aria-hidden="true">
				<svg class="rentalLanding__iconSvg" viewBox="0 0 24 24">
					<path
						fill="currentColor"
						d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5L4 8V6l8 5 8-5v2z"
					/>
				</svg>
			</span>
			<span class="rentalLanding__label">Contact us</span>
		</a>
	</nav>
</div>

<style>
	.rentalLanding {
		width: 100%;
		max-width: 28rem;
	}

	.rentalLanding__header {
		margin-bottom: 1.75rem;
	}

	.rentalLanding__eyebrow {
		margin: 0 0 0.75rem;
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.2em;
		text-transform: uppercase;
	}

	.rentalLanding__title {
		margin: 0 0 0.5rem;
		font-size: clamp(1.75rem, 5vw, 2.5rem);
		font-weight: 600;
		line-height: 1.12;
		letter-spacing: -0.02em;
	}

	.rentalLanding__tagline {
		margin: 0;
		font-size: 1.05rem;
		line-height: 1.45;
	}

	.rentalLanding__grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.85rem;
	}

	.rentalLanding__tile {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.65rem;
		min-height: 7.25rem;
		padding: 1rem 0.75rem;
		border-radius: 0.5rem;
		text-decoration: none;
		font-weight: 600;
		font-size: 0.9rem;
		text-align: center;
		line-height: 1.25;
		transition:
			background 0.15s ease,
			border-color 0.15s ease,
			box-shadow 0.15s ease,
			transform 0.12s ease;
	}

	.rentalLanding__tile:focus {
		outline: none;
	}

	.rentalLanding__tile:focus-visible {
		outline: 2px solid currentColor;
		outline-offset: 3px;
	}

	.rentalLanding__icon {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.rentalLanding__iconSvg {
		width: 2rem;
		height: 2rem;
		display: block;
	}

	.rentalLanding__label {
		max-width: 11rem;
	}

	/* CDA — cool blue hero */
	.rentalLanding--cda .rentalLanding__eyebrow {
		color: rgb(224 242 254 / 0.85);
	}

	.rentalLanding--cda .rentalLanding__title {
		font-family: Georgia, 'Times New Roman', serif;
		font-weight: 400;
		letter-spacing: -0.03em;
		color: #ecfeff;
	}

	.rentalLanding--cda .rentalLanding__tagline {
		color: rgb(224 242 254 / 0.92);
		font-weight: 300;
	}

	.rentalLanding--cda .rentalLanding__tile {
		color: #ecfeff;
		background: rgb(255 255 255 / 0.09);
		border: 1px solid rgb(186 230 253 / 0.35);
	}

	.rentalLanding--cda .rentalLanding__tile:hover {
		background: rgb(255 255 255 / 0.14);
		border-color: rgb(186 230 253 / 0.55);
		box-shadow: 0 4px 20px rgb(0 0 0 / 0.12);
		transform: translateY(-1px);
	}

	/* Sandpoint — green / dark */
	.rentalLanding--spt .rentalLanding__title {
		font-weight: 300;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: #ecfdf5;
		font-size: clamp(1.65rem, 4.5vw, 2.35rem);
	}

	.rentalLanding--spt .rentalLanding__tagline {
		font-size: 0.95rem;
		font-weight: 500;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: rgb(167 243 208 / 0.9);
	}

	.rentalLanding--spt .rentalLanding__tile {
		color: #ecfdf5;
		background: rgb(255 255 255 / 0.06);
		border: 1px solid rgb(167 243 208 / 0.28);
	}

	.rentalLanding--spt .rentalLanding__tile:hover {
		background: rgb(255 255 255 / 0.1);
		border-color: rgb(167 243 208 / 0.45);
		box-shadow: 0 4px 24px rgb(0 0 0 / 0.2);
		transform: translateY(-1px);
	}

	/* Moscow — light warm */
	.rentalLanding--mos .rentalLanding__title {
		font-weight: 800;
		letter-spacing: -0.04em;
		text-transform: uppercase;
		color: #292524;
		font-size: clamp(2rem, 5vw, 2.65rem);
	}

	.rentalLanding--mos .rentalLanding__tagline {
		font-weight: 500;
		color: #57534e;
	}

	.rentalLanding--mos .rentalLanding__tile {
		color: #292524;
		background: #fff;
		border: 1px solid #d6d3d1;
		box-shadow: 0 1px 2px rgb(0 0 0 / 0.06);
	}

	.rentalLanding--mos .rentalLanding__tile:hover {
		border-color: #c2410c;
		box-shadow: 0 4px 14px rgb(154 52 18 / 0.12);
		transform: translateY(-1px);
	}

	.rentalLanding--mos .rentalLanding__tile:focus-visible {
		outline-color: #c2410c;
	}
</style>
