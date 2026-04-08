<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import type { RentalWysiwygTheme } from '$lib/cityAppfolioLinks';
	import type { CitySlug } from '$lib/cities';
	import RentalWysiwygGear from '$lib/RentalWysiwygGear.svelte';

	let {
		theme,
		wysiwyg = null,
		heroImageUrl = null,
		headline = null,
		body = null
	}: {
		theme: CitySlug;
		wysiwyg?: RentalWysiwygTheme | null;
		/** Optional full URL for hero / background (HTTPS or site-relative). */
		heroImageUrl?: string | null;
		headline?: string | null;
		/** Plain text; line breaks preserved. */
		body?: string | null;
	} = $props();

	const canEditLanding = $derived(page.data.user?.role === 'admin');

	const hasHero = $derived(Boolean(heroImageUrl?.trim()));
	const heroUrl = $derived(heroImageUrl?.trim() ?? '');
	const hasHeadline = $derived(Boolean(headline?.trim()));
	const hasBody = $derived(Boolean(body?.trim()));
	const hasEditorial = $derived(hasHero || hasHeadline || hasBody);

	const hasLandingWysiwyg = $derived(
		!!(
			wysiwyg?.landingBg ||
			wysiwyg?.landingFg ||
			wysiwyg?.landingFont ||
			wysiwyg?.landingReadingMaxWidthPx != null
		)
	);

	type EditTarget = 'headline' | 'body';
	let editing = $state<EditTarget | null>(null);
	let draftHeadline = $state('');
	let draftBody = $state('');
	let saving = $state(false);
	let saveError = $state<string | null>(null);

	function startEdit(target: EditTarget) {
		saveError = null;
		editing = target;
		if (target === 'headline') draftHeadline = headline?.trim() ?? '';
		if (target === 'body') draftBody = body ?? '';
	}

	function cancelEdit() {
		editing = null;
		saveError = null;
	}

	async function saveEdit() {
		if (!editing) return;
		saving = true;
		saveError = null;
		const landingHeroImageUrl = heroImageUrl?.trim() ?? '';
		const landingHeadline =
			editing === 'headline' ? draftHeadline : (headline?.trim() ?? '');
		const landingBody = editing === 'body' ? draftBody : (body ?? '');

		try {
			const res = await fetch('/api/admin/rental-landing', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					citySlug: theme,
					landingHeroImageUrl,
					landingHeadline,
					landingBody
				})
			});
			const data = (await res.json().catch(() => ({}))) as { message?: string };
			if (!res.ok) {
				saveError = data.message ?? 'Save failed.';
				return;
			}
			editing = null;
			await invalidateAll();
		} catch {
			saveError = 'Network error.';
		} finally {
			saving = false;
		}
	}
</script>

<div class="rentalLandingFrame">
	{#if canEditLanding}
		<div class="rentalLandingFrame__heroSection rentalLandingFrame__heroSection--gear">
			<RentalWysiwygGear
				variant="hero"
				citySlug={theme}
				{wysiwyg}
				heroUrl={heroImageUrl}
				{headline}
				{body}
			/>
			<div class="rentalLandingFrame__heroView">
				{#if hasHero}
					<div
						class="rentalLandingFrame__hero"
						style:background-image={`url(${JSON.stringify(heroUrl)})`}
						aria-hidden="true"
					></div>
				{:else}
					<div class="rentalLandingFrame__heroPlaceholder">No hero image — use the gear to set URL or upload</div>
				{/if}
			</div>
		</div>

		<div class="rentalLandingFrame__mainOuter rentalLandingFrame__mainOuter--admin">
			<RentalWysiwygGear variant="landing" citySlug={theme} {wysiwyg} heroUrl={heroImageUrl} {headline} {body} />
			<div
				class="rentalLandingFrame__main"
				class:rentalLandingFrame__main--wysiwyg={hasLandingWysiwyg}
				style:background={wysiwyg?.landingBg ?? undefined}
				style:color={wysiwyg?.landingFg ?? undefined}
				style:font-family={wysiwyg?.landingFont ?? undefined}
				style:max-width={wysiwyg?.landingReadingMaxWidthPx != null
					? `${wysiwyg.landingReadingMaxWidthPx}px`
					: undefined}
			>
			{#if editing === 'headline'}
				<div class="rentalLandingFrame__editor">
					<label class="rentalLandingFrame__label" for="landing-headline">Headline</label>
					<input
						id="landing-headline"
						class="rentalLandingFrame__input"
						type="text"
						autocomplete="off"
						bind:value={draftHeadline}
						disabled={saving}
					/>
					{#if saveError}
						<p class="rentalLandingFrame__err" role="alert">{saveError}</p>
					{/if}
					<div class="rentalLandingFrame__editorActions">
						<button class="rentalLandingFrame__btn" type="button" disabled={saving} onclick={saveEdit}>
							{saving ? 'Saving…' : 'Save'}
						</button>
						<button
							class="rentalLandingFrame__btn rentalLandingFrame__btn--ghost"
							type="button"
							disabled={saving}
							onclick={cancelEdit}
						>
							Cancel
						</button>
					</div>
				</div>
			{:else}
				<div class="rentalLandingFrame__editWrap rentalLandingFrame__editWrap--text">
					{#if hasHeadline}
						<h2 class="rentalLandingFrame__headline">{headline!.trim()}</h2>
					{:else}
						<p class="rentalLandingFrame__emptyHint">No headline</p>
					{/if}
					<button
						class="rentalLandingFrame__editBtn"
						type="button"
						onclick={() => startEdit('headline')}
					>
						Edit
					</button>
				</div>
			{/if}

			{#if editing === 'body'}
				<div class="rentalLandingFrame__editor">
					<label class="rentalLandingFrame__label" for="landing-body">Body</label>
					<textarea
						id="landing-body"
						class="rentalLandingFrame__textarea"
						rows="8"
						bind:value={draftBody}
						disabled={saving}
					></textarea>
					{#if saveError}
						<p class="rentalLandingFrame__err" role="alert">{saveError}</p>
					{/if}
					<div class="rentalLandingFrame__editorActions">
						<button class="rentalLandingFrame__btn" type="button" disabled={saving} onclick={saveEdit}>
							{saving ? 'Saving…' : 'Save'}
						</button>
						<button
							class="rentalLandingFrame__btn rentalLandingFrame__btn--ghost"
							type="button"
							disabled={saving}
							onclick={cancelEdit}
						>
							Cancel
						</button>
					</div>
				</div>
			{:else}
				<div class="rentalLandingFrame__editWrap rentalLandingFrame__editWrap--text">
					{#if hasBody}
						<div class="rentalLandingFrame__body">{body!.trim()}</div>
					{:else}
						<p class="rentalLandingFrame__emptyHint">No body text</p>
					{/if}
					<button
						class="rentalLandingFrame__editBtn"
						type="button"
						onclick={() => startEdit('body')}
					>
						Edit
					</button>
				</div>
			{/if}

			{#if !hasEditorial && editing === null}
				<p class="rentalLandingFrame__fallback">
					No listings iframe or tile links yet. Configure URLs and embedded listings under
					<a class="rentalLandingFrame__adminLink" href="/admin/rental-links">Admin → Rental links</a>,
					or add hero, headline, and body here.
				</p>
			{/if}
		</div>
		</div>
	{:else}
		{#if hasHero}
			<div
				class="rentalLandingFrame__hero"
				style:background-image={`url(${JSON.stringify(heroUrl)})`}
				aria-hidden="true"
			></div>
		{/if}

		<div
			class="rentalLandingFrame__main"
			class:rentalLandingFrame__main--wysiwyg={hasLandingWysiwyg}
			style:background={wysiwyg?.landingBg ?? undefined}
			style:color={wysiwyg?.landingFg ?? undefined}
			style:font-family={wysiwyg?.landingFont ?? undefined}
			style:max-width={wysiwyg?.landingReadingMaxWidthPx != null
				? `${wysiwyg.landingReadingMaxWidthPx}px`
				: undefined}
		>
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
	{/if}
</div>

<style>
	/*
	 * Landing copy font sizes — set once via custom properties; city themes override
	 * `--rlf-*` on `:global(.rentalLanding--{theme}) .rentalLandingFrame` below.
	 */
	.rentalLandingFrame {
		--rlf-headline-size: clamp(1.25rem, 2.5vw, 1.65rem);
		--rlf-body-size: 1rem;
		--rlf-empty-hint-size: 0.95rem;
		--rlf-fallback-size: 0.95rem;
		--rlf-hero-placeholder-size: 0.9rem;

		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: 0;
		min-height: 12rem;
		overflow: auto;
	}

	.rentalLandingFrame__heroSection {
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
	}

	.rentalLandingFrame__heroSection--gear {
		position: relative;
	}

	.rentalLandingFrame__heroView {
		position: relative;
	}

	.rentalLandingFrame__mainOuter {
		position: relative;
		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: 0;
	}

	.rentalLandingFrame__mainOuter--admin .rentalLandingFrame__main {
		padding-left: 2.75rem;
	}

	.rentalLandingFrame__main--wysiwyg {
		margin-inline: auto;
		width: 100%;
	}

	.rentalLandingFrame__hero {
		flex-shrink: 0;
		min-height: clamp(10rem, 28vh, 18rem);
		background-size: cover;
		background-position: center;
		background-repeat: no-repeat;
	}

	.rentalLandingFrame__heroPlaceholder {
		min-height: clamp(6rem, 16vh, 10rem);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: var(--rlf-hero-placeholder-size);
		opacity: 0.65;
		border: 1px dashed color-mix(in srgb, currentColor 28%, transparent);
		border-radius: 0.35rem;
		margin: 0.25rem;
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
		font-size: var(--rlf-headline-size);
		font-weight: 650;
		line-height: 1.2;
		letter-spacing: -0.02em;
	}

	.rentalLandingFrame__body {
		margin: 0;
		font-size: var(--rlf-body-size);
		line-height: 1.55;
		white-space: pre-line;
	}

	.rentalLandingFrame__emptyHint {
		margin: 0;
		font-size: var(--rlf-empty-hint-size);
		opacity: 0.65;
		font-style: italic;
	}

	.rentalLandingFrame__fallback {
		margin: 0;
		max-width: 28rem;
		font-size: var(--rlf-fallback-size);
		line-height: 1.5;
		text-align: center;
		align-self: center;
	}

	.rentalLandingFrame__adminLink {
		font-weight: 650;
		text-decoration: underline;
		text-underline-offset: 0.15em;
	}

	.rentalLandingFrame__editWrap {
		position: relative;
		border-radius: 0.35rem;
		outline: 1px solid transparent;
		transition: outline-color 0.12s ease;
	}

	.rentalLandingFrame__editWrap:hover,
	.rentalLandingFrame__editWrap:focus-within {
		outline-color: color-mix(in srgb, currentColor 22%, transparent);
	}

	.rentalLandingFrame__editWrap--text {
		padding: 0.35rem 4.25rem 0.35rem 0.35rem;
		min-height: 2.5rem;
	}

	.rentalLandingFrame__editBtn {
		position: absolute;
		top: 0.35rem;
		right: 0.35rem;
		appearance: none;
		font: inherit;
		font-size: 0.8rem;
		font-weight: 650;
		padding: 0.25rem 0.55rem;
		border-radius: 0.35rem;
		border: 1px solid color-mix(in srgb, currentColor 22%, transparent);
		background: color-mix(in srgb, Canvas 88%, transparent);
		color: inherit;
		cursor: pointer;
		opacity: 0;
		transition: opacity 0.12s ease;
	}

	.rentalLandingFrame__editWrap:hover .rentalLandingFrame__editBtn,
	.rentalLandingFrame__editWrap:focus-within .rentalLandingFrame__editBtn {
		opacity: 1;
	}

	@media (hover: none) {
		.rentalLandingFrame__editBtn {
			opacity: 0.85;
		}
	}

	/* Form edit mode: fixed light surface so fields stay readable on dark city themes */
	.rentalLandingFrame__editor {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: clamp(1rem, 2.5vw, 1.25rem);
		margin: 0.25rem;
		border-radius: 0.5rem;
		border: 1px solid #d4d4d4;
		background: #fff;
		color: #171717;
	}

	.rentalLandingFrame__label {
		font-size: 0.8rem;
		font-weight: 650;
		color: #262626;
	}

	.rentalLandingFrame__input,
	.rentalLandingFrame__textarea {
		width: 100%;
		font: inherit;
		font-size: 0.95rem;
		padding: 0.45rem 0.55rem;
		border-radius: 0.35rem;
		border: 1px solid #a3a3a3;
		background: #fff;
		color: #171717;
		box-sizing: border-box;
	}

	.rentalLandingFrame__textarea {
		resize: vertical;
		min-height: 8rem;
		line-height: 1.45;
	}

	.rentalLandingFrame__input::placeholder,
	.rentalLandingFrame__textarea::placeholder {
		color: #737373;
	}

	.rentalLandingFrame__editorActions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.rentalLandingFrame__btn {
		appearance: none;
		font: inherit;
		font-weight: 650;
		font-size: 0.88rem;
		padding: 0.4rem 0.85rem;
		border-radius: 0.35rem;
		border: 1px solid #525252;
		background: #f5f5f5;
		color: #171717;
		cursor: pointer;
	}

	.rentalLandingFrame__btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.rentalLandingFrame__btn--ghost {
		background: #fff;
		font-weight: 550;
	}

	.rentalLandingFrame__err {
		margin: 0;
		font-size: 0.88rem;
		color: #b91c1c;
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
		--rlf-headline-size: clamp(1.2rem, 2.4vw, 1.5rem);
		--rlf-body-size: 0.95rem;
	}

	:global(.rentalLanding--spt) .rentalLandingFrame__headline {
		font-weight: 300;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: #ecfdf5;
	}

	:global(.rentalLanding--spt) .rentalLandingFrame__body {
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
		--rlf-headline-size: clamp(1.35rem, 2.8vw, 1.85rem);
	}

	:global(.rentalLanding--mos) .rentalLandingFrame__headline {
		font-weight: 800;
		letter-spacing: -0.03em;
		text-transform: uppercase;
		color: #292524;
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

	:global(.rentalLanding--cda) .rentalLandingFrame__main--wysiwyg .rentalLandingFrame__headline,
	:global(.rentalLanding--cda) .rentalLandingFrame__main--wysiwyg .rentalLandingFrame__body,
	:global(.rentalLanding--cda) .rentalLandingFrame__main--wysiwyg .rentalLandingFrame__fallback,
	:global(.rentalLanding--spt) .rentalLandingFrame__main--wysiwyg .rentalLandingFrame__headline,
	:global(.rentalLanding--spt) .rentalLandingFrame__main--wysiwyg .rentalLandingFrame__body,
	:global(.rentalLanding--spt) .rentalLandingFrame__main--wysiwyg .rentalLandingFrame__fallback,
	:global(.rentalLanding--mos) .rentalLandingFrame__main--wysiwyg .rentalLandingFrame__headline,
	:global(.rentalLanding--mos) .rentalLandingFrame__main--wysiwyg .rentalLandingFrame__body,
	:global(.rentalLanding--mos) .rentalLandingFrame__main--wysiwyg .rentalLandingFrame__fallback {
		color: inherit;
	}

	:global(.rentalLanding--cda) .rentalLandingFrame__main--wysiwyg .rentalLandingFrame__adminLink,
	:global(.rentalLanding--spt) .rentalLandingFrame__main--wysiwyg .rentalLandingFrame__adminLink,
	:global(.rentalLanding--mos) .rentalLandingFrame__main--wysiwyg .rentalLandingFrame__adminLink {
		color: inherit;
		text-decoration-color: currentColor;
	}
</style>
