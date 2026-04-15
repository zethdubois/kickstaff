<!--
  @docs: docs/sop-svelte-and-components.md
  @component: RentalLandingGrid.svelte
  @faq: docs/guides/RentalLandingGrid.md
-->
<script lang="ts">
	import { page } from '$app/state';
	import type { CityAppfolioLinks } from '$lib/cityAppfolioLinks';
	import type { CitySlug } from '$lib/cities';
	import RentalContactModal from '$lib/RentalContactModal.svelte';
	import RentalLandingFrame from '$lib/RentalLandingFrame.svelte';
	import RentalWysiwygGear from '$lib/RentalWysiwygGear.svelte';

	type TileKey = 'short' | 'long' | 'apply' | 'contact';

	let {
		links,
		title,
		taglineDefault,
		tagline: taglineProp,
		theme,
		listingEmbedUrl,
		landingHeroImageUrl = null,
		landingHeadline = null,
		landingBody = null
	}: {
		links: CityAppfolioLinks;
		title: string;
		/** Fallback subtitle when `links.sidebarTagline` is unset. */
		taglineDefault?: string;
		/** @deprecated Same as `taglineDefault` (older prop name). */
		tagline?: string;
		theme: CitySlug;
		/** AppFolio /listings URL (same query as Appfolio.Listing + listing.js). */
		listingEmbedUrl: string | null;
		landingHeroImageUrl?: string | null;
		landingHeadline?: string | null;
		landingBody?: string | null;
	} = $props();

	/** Resolved line under the title (DB override or page default). */
	const tagline = $derived(links.sidebarTagline ?? taglineDefault ?? taglineProp ?? '');

	const defaultSubtitleHint = $derived(taglineDefault ?? taglineProp ?? '');

	const navAsideBg = $derived(
		(() => {
			const w = links.wysiwyg;
			if (w?.navGradientFrom && w?.navGradientTo) {
				const a = w.navGradientAngleDeg ?? 180;
				return `linear-gradient(${a}deg, ${w.navGradientFrom}, ${w.navGradientTo})`;
			}
			return w?.navBg ?? undefined;
		})()
	);

	const tiles = $derived([
		{ key: 'short' as const, href: links.shortTerm, label: 'Short-term rentals' },
		{ key: 'long' as const, href: links.longTerm, label: 'Long-term rentals' },
		{ key: 'apply' as const, href: links.apply, label: 'Apply today' },
		{ key: 'contact' as const, href: links.contact, label: 'Contact us' }
	]);

	/** Iframe loads only after a nav tile click; null shows the landing frame in the main column. */
	let iframeSrc = $state<string | null>(null);
	let contactOpen = $state(false);

	$effect(() => {
		theme;
		listingEmbedUrl;
		iframeSrc = null;
	});

	function onTileClick(e: MouseEvent, href: string) {
		if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
		e.preventDefault();
		iframeSrc = href;
	}

	function onContactClick(e: MouseEvent) {
		if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
		e.preventDefault();
		contactOpen = true;
	}

	const isAdmin = $derived(page.data.user?.role === 'admin');

	const navCustom = $derived(
		!!(
			links.wysiwyg?.navBg ||
			links.wysiwyg?.navFg ||
			links.wysiwyg?.navFont ||
			(links.wysiwyg?.navGradientFrom && links.wysiwyg?.navGradientTo) ||
			links.wysiwyg?.navFontSizePx != null
		)
	);

	const navFontSized = $derived(links.wysiwyg?.navFontSizePx != null);
</script>

{#snippet tileIcon(key: TileKey)}
	{#if key === 'short'}
		<svg class="rentalLanding__iconSvg" viewBox="0 0 24 24">
			<path
				fill="currentColor"
				d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"
			/>
		</svg>
	{:else if key === 'long'}
		<svg class="rentalLanding__iconSvg" viewBox="0 0 24 24">
			<path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8h5z" />
		</svg>
	{:else if key === 'apply'}
		<svg class="rentalLanding__iconSvg" viewBox="0 0 24 24">
			<path
				fill="currentColor"
				d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11zM8 15.01l1.41 1.41L11 14.83V22h2v-7.17l1.59 1.59L16 15.01 12.01 11 8 15.01z"
			/>
		</svg>
	{:else}
		<svg class="rentalLanding__iconSvg" viewBox="0 0 24 24">
			<path
				fill="currentColor"
				d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5L4 8V6l8 5 8-5v2z"
			/>
		</svg>
	{/if}
{/snippet}

<div class="rentalLanding rentalLanding--{theme}">
	<div class="rentalLanding__layout">
		<div class="rentalLanding__sidebarWrap">
			{#if isAdmin}
				<RentalWysiwygGear
					variant="nav"
					citySlug={theme}
					wysiwyg={links.wysiwyg}
					sidebarTagline={links.sidebarTagline}
					taglineDefault={defaultSubtitleHint}
				/>
			{/if}
			<aside
				class="rentalLanding__sidebar"
				class:rentalLanding__sidebar--custom={navCustom}
				class:rentalLanding__sidebar--navFontSize={navFontSized}
				style:background={navAsideBg}
				style:color={links.wysiwyg?.navFg ?? undefined}
				style:font-family={links.wysiwyg?.navFont ?? undefined}
				style:font-size={links.wysiwyg?.navFontSizePx != null
					? `${links.wysiwyg.navFontSizePx}px`
					: undefined}
			>
			<header class="rentalLanding__header">
				{#if theme === 'cda'}
					<p class="rentalLanding__eyebrow">Rentals</p>
				{/if}
				<h1 class="rentalLanding__title">{title}</h1>
				<p class="rentalLanding__tagline">{tagline}</p>
			</header>

			<div class="rentalLanding__sidebarBody">
				<nav class="rentalLanding__nav" aria-label="Rental links">
					{#each tiles as { key, href, label } (key)}
						{#if key === 'contact'}
							<button
								class="rentalLanding__tile rentalLanding__tile--btn"
								type="button"
								aria-label={label}
								onclick={onContactClick}
							>
								<span class="rentalLanding__icon" aria-hidden="true">
									{@render tileIcon(key)}
								</span>
								<span class="rentalLanding__label">{label}</span>
							</button>
						{:else if href}
							<a
								class="rentalLanding__tile"
								{href}
								aria-label={label}
								onclick={(e) => onTileClick(e, href)}
							>
								<span class="rentalLanding__icon" aria-hidden="true">
									{@render tileIcon(key)}
								</span>
								<span class="rentalLanding__label">{label}</span>
							</a>
						{:else}
							<span
								class="rentalLanding__tile rentalLanding__tile--disabled"
								aria-disabled="true"
								aria-label="{label} — link not configured"
								title="Link not configured"
							>
								<span class="rentalLanding__icon" aria-hidden="true">
									{@render tileIcon(key)}
								</span>
								<span class="rentalLanding__label">{label}</span>
							</span>
						{/if}
					{/each}
				</nav>
				{#if links.tenantPortal}
					<div class="rentalLanding__tenantFooter">
						<a
							class="rentalLanding__tile"
							href={links.tenantPortal}
							target="_blank"
							rel="noopener noreferrer"
							aria-label="Tenant portal — opens in a new tab"
						>
							<span class="rentalLanding__icon" aria-hidden="true">
								<svg class="rentalLanding__iconSvg" viewBox="0 0 24 24">
									<path
										fill="currentColor"
										d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
									/>
								</svg>
							</span>
							<span class="rentalLanding__label">Tenant portal</span>
						</a>
					</div>
				{/if}
			</div>
		</aside>
		</div>

		<section class="rentalLanding__embed" aria-label="AppFolio content">
			{#if iframeSrc}
				<iframe class="rentalLanding__frame" title="AppFolio" src={iframeSrc}></iframe>
			{:else}
				<RentalLandingFrame
					{theme}
					wysiwyg={links.wysiwyg}
					heroImageUrl={landingHeroImageUrl}
					heroBgPositionYPct={links.landingHeroBgPositionYPct}
					headline={landingHeadline}
					body={landingBody}
				/>
			{/if}
		</section>
	</div>
</div>

<RentalContactModal bind:open={contactOpen} citySlug={theme} cityLabel={title} />

<style>
	.rentalLanding {
		width: 100%;
	}

	.rentalLanding__layout {
		display: grid;
		grid-template-columns: 320px minmax(0, 1fr);
		grid-template-rows: 1fr;
		align-items: stretch;
		min-height: calc(100dvh - var(--rental-viewport-offset, 0px));
	}

	.rentalLanding__sidebarWrap {
		position: relative;
		min-width: 0;
		min-height: 0;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-self: stretch;
	}

	.rentalLanding__sidebar {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		padding: clamp(1.25rem, 3vw, 2rem) clamp(1rem, 2.5vw, 1.5rem)
			clamp(1rem, 3vh, 2.25rem);
		border-right: 1px solid transparent;
	}

	.rentalLanding__sidebarBody {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
	}

	.rentalLanding__header {
		flex-shrink: 0;
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
		font-size: clamp(1.5rem, 3.5vw, 2.25rem);
		font-weight: 600;
		line-height: 1.12;
		letter-spacing: -0.02em;
	}

	.rentalLanding__tagline {
		margin: 0;
		font-size: 1rem;
		line-height: 1.45;
	}

	.rentalLanding__nav {
		flex: 1 1 auto;
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
		min-height: 0;
	}

	.rentalLanding__tenantFooter {
		flex-shrink: 0;
		margin-top: auto;
		padding-top: 0.75rem;
	}

	.rentalLanding__tile--btn {
		appearance: none;
		font: inherit;
		width: 100%;
		margin: 0;
		cursor: pointer;
		text-align: left;
	}

	.rentalLanding__tile {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: flex-start;
		gap: 0.75rem;
		min-height: 3.25rem;
		padding: 0.65rem 0.85rem;
		border-radius: 0.5rem;
		text-decoration: none;
		font-weight: 600;
		font-size: 0.88rem;
		text-align: left;
		line-height: 1.25;
		box-sizing: border-box;
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

	.rentalLanding__tile--disabled {
		opacity: 0.48;
		cursor: not-allowed;
		pointer-events: none;
	}

	.rentalLanding__icon {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.rentalLanding__iconSvg {
		width: 1.65rem;
		height: 1.65rem;
		display: block;
	}

	.rentalLanding__label {
		flex: 1;
		min-width: 0;
	}

	.rentalLanding__embed {
		display: flex;
		flex-direction: column;
		min-width: 0;
		min-height: 0;
		background:
			radial-gradient(circle at center, rgb(15 23 42 / 0.1) 1px, transparent 1.12px),
			#fff;
		background-size: 24px 24px, auto;
	}

	.rentalLanding__frame {
		flex: 1 1 auto;
		width: 100%;
		min-height: 0;
		border: 0;
	}

	@media (max-width: 52rem) {
		.rentalLanding__layout {
			grid-template-columns: 1fr;
			grid-template-rows: auto minmax(22rem, 55vh);
			min-height: unset;
		}

		.rentalLanding__sidebar {
			border-right: none;
			border-bottom: 1px solid transparent;
		}
	}

	/* CDA — cool blue hero */
	.rentalLanding--cda .rentalLanding__sidebar {
		border-right-color: rgb(186 230 253 / 0.22);
	}

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

	.rentalLanding--cda .rentalLanding__tile:not(.rentalLanding__tile--disabled) {
		color: #ecfeff;
		background: rgb(255 255 255 / 0.09);
		border: 1px solid rgb(186 230 253 / 0.35);
	}

	.rentalLanding--cda .rentalLanding__tile:not(.rentalLanding__tile--disabled):hover {
		background: rgb(255 255 255 / 0.14);
		border-color: rgb(186 230 253 / 0.55);
		box-shadow: 0 4px 20px rgb(0 0 0 / 0.12);
		transform: translateY(-1px);
	}

	.rentalLanding--cda .rentalLanding__tile--disabled {
		color: #ecfeff;
		background: rgb(255 255 255 / 0.05);
		border: 1px dashed rgb(186 230 253 / 0.28);
	}

	@media (max-width: 52rem) {
		.rentalLanding--cda .rentalLanding__sidebar {
			border-bottom-color: rgb(186 230 253 / 0.22);
		}
	}

	/* Sandpoint — green / dark */
	.rentalLanding--spt .rentalLanding__sidebar {
		border-right-color: rgb(167 243 208 / 0.18);
	}

	.rentalLanding--spt .rentalLanding__title {
		font-weight: 300;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: #ecfdf5;
		font-size: clamp(1.45rem, 3.2vw, 2.1rem);
	}

	.rentalLanding--spt .rentalLanding__tagline {
		font-size: 0.9rem;
		font-weight: 500;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: rgb(167 243 208 / 0.9);
	}

	.rentalLanding--spt .rentalLanding__tile:not(.rentalLanding__tile--disabled) {
		color: #ecfdf5;
		background: rgb(255 255 255 / 0.06);
		border: 1px solid rgb(167 243 208 / 0.28);
	}

	.rentalLanding--spt .rentalLanding__tile:not(.rentalLanding__tile--disabled):hover {
		background: rgb(255 255 255 / 0.1);
		border-color: rgb(167 243 208 / 0.45);
		box-shadow: 0 4px 24px rgb(0 0 0 / 0.2);
		transform: translateY(-1px);
	}

	.rentalLanding--spt .rentalLanding__tile--disabled {
		color: #ecfdf5;
		background: rgb(255 255 255 / 0.03);
		border: 1px dashed rgb(167 243 208 / 0.22);
	}

	@media (max-width: 52rem) {
		.rentalLanding--spt .rentalLanding__sidebar {
			border-bottom-color: rgb(167 243 208 / 0.18);
		}
	}

	/* Moscow — light warm */
	.rentalLanding--mos .rentalLanding__sidebar {
		border-right-color: #d6d3d1;
	}

	.rentalLanding--mos .rentalLanding__title {
		font-weight: 800;
		letter-spacing: -0.04em;
		text-transform: uppercase;
		color: #292524;
		font-size: clamp(1.65rem, 3.8vw, 2.35rem);
	}

	.rentalLanding--mos .rentalLanding__tagline {
		font-weight: 500;
		color: #57534e;
	}

	.rentalLanding--mos .rentalLanding__tile:not(.rentalLanding__tile--disabled) {
		color: #292524;
		background: #fff;
		border: 1px solid #d6d3d1;
		box-shadow: 0 1px 2px rgb(0 0 0 / 0.06);
	}

	.rentalLanding--mos .rentalLanding__tile:not(.rentalLanding__tile--disabled):hover {
		border-color: #c2410c;
		box-shadow: 0 4px 14px rgb(154 52 18 / 0.12);
		transform: translateY(-1px);
	}

	.rentalLanding--mos .rentalLanding__tile--disabled {
		color: #78716c;
		background: rgb(255 255 255 / 0.65);
		border: 1px dashed #d6d3d1;
		box-shadow: none;
	}

	.rentalLanding--mos .rentalLanding__tile:not(.rentalLanding__tile--disabled):focus-visible {
		outline-color: #c2410c;
	}

	@media (max-width: 52rem) {
		.rentalLanding--mos .rentalLanding__sidebar {
			border-bottom-color: #d6d3d1;
		}
	}

	/* WYSIWYG nav: override city theme tiles when custom colors are set */
	.rentalLanding--cda .rentalLanding__sidebar--custom .rentalLanding__tile:not(.rentalLanding__tile--disabled),
	.rentalLanding--spt .rentalLanding__sidebar--custom .rentalLanding__tile:not(.rentalLanding__tile--disabled),
	.rentalLanding--mos .rentalLanding__sidebar--custom .rentalLanding__tile:not(.rentalLanding__tile--disabled) {
		color: inherit;
		background: color-mix(in srgb, currentColor 10%, transparent);
		border-color: color-mix(in srgb, currentColor 28%, transparent);
		box-shadow: none;
		transform: none;
	}

	.rentalLanding--cda .rentalLanding__sidebar--custom .rentalLanding__tile:not(.rentalLanding__tile--disabled):hover,
	.rentalLanding--spt .rentalLanding__sidebar--custom .rentalLanding__tile:not(.rentalLanding__tile--disabled):hover,
	.rentalLanding--mos .rentalLanding__sidebar--custom .rentalLanding__tile:not(.rentalLanding__tile--disabled):hover {
		background: color-mix(in srgb, currentColor 16%, transparent);
		border-color: color-mix(in srgb, currentColor 38%, transparent);
		box-shadow: none;
		transform: none;
	}

	.rentalLanding--cda .rentalLanding__sidebar--custom .rentalLanding__tile--disabled,
	.rentalLanding--spt .rentalLanding__sidebar--custom .rentalLanding__tile--disabled,
	.rentalLanding--mos .rentalLanding__sidebar--custom .rentalLanding__tile--disabled {
		color: inherit;
		opacity: 0.45;
		border-color: color-mix(in srgb, currentColor 22%, transparent);
	}

	.rentalLanding--cda .rentalLanding__sidebar--custom .rentalLanding__eyebrow,
	.rentalLanding--cda .rentalLanding__sidebar--custom .rentalLanding__title,
	.rentalLanding--cda .rentalLanding__sidebar--custom .rentalLanding__tagline,
	.rentalLanding--spt .rentalLanding__sidebar--custom .rentalLanding__title,
	.rentalLanding--spt .rentalLanding__sidebar--custom .rentalLanding__tagline,
	.rentalLanding--mos .rentalLanding__sidebar--custom .rentalLanding__title,
	.rentalLanding--mos .rentalLanding__sidebar--custom .rentalLanding__tagline {
		color: inherit;
	}

	.rentalLanding .rentalLanding__sidebar--navFontSize .rentalLanding__title {
		font-size: clamp(1.2em, 2.8vw, 1.65em);
	}
</style>
