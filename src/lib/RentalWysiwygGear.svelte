<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	import type { RentalWysiwygTheme } from '$lib/cityAppfolioLinks';
	import type { CitySlug } from '$lib/cities';
	import { RENTAL_FONT_STACK_OPTIONS } from '$lib/rentalFontStacks';

	type Variant = 'nav' | 'hero' | 'landing';

	const DEBOUNCE_MS = 450;

	let {
		variant,
		citySlug,
		wysiwyg = null,
		heroUrl = null,
		heroBgPositionYPct = null,
		headline = null,
		body = null
	}: {
		variant: Variant;
		citySlug: CitySlug;
		wysiwyg?: RentalWysiwygTheme | null;
		heroUrl?: string | null;
		/** Hero background vertical position 0–100 (null = center). */
		heroBgPositionYPct?: number | null;
		headline?: string | null;
		body?: string | null;
	} = $props();

	let open = $state(false);
	let busy = $state(false);
	let err = $state<string | null>(null);

	let rootEl = $state<HTMLDivElement | null>(null);

	let navBg = $state('#ffffff');
	let navFg = $state('#171717');
	let navFont = $state('');
	let navWidth = $state(320);

	let landingBg = $state('#ffffff');
	let landingFg = $state('#171717');
	let landingFont = $state('');
	let landingWidth = $state(640);

	let heroDraftUrl = $state('');
	let heroFile = $state<File | null>(null);
	let heroPositionY = $state(50);

	/** Full theme + hero URL at panel open — used by Cancel to revert. */
	let snapshotTheme = $state<RentalWysiwygTheme | null>(null);
	let snapshotHeroUrl = $state<string | null>(null);
	let snapshotHeroPositionY = $state<number | null>(null);

	let debounceNavLand: ReturnType<typeof setTimeout> | null = null;
	let debounceHero: ReturnType<typeof setTimeout> | null = null;

	function clearNavLandDebounce() {
		if (debounceNavLand) {
			clearTimeout(debounceNavLand);
			debounceNavLand = null;
		}
	}

	function clearHeroDebounce() {
		if (debounceHero) {
			clearTimeout(debounceHero);
			debounceHero = null;
		}
	}

	function syncDraftsFromProps() {
		err = null;
		const w = wysiwyg;
		if (variant === 'nav') {
			navBg = w?.navBg ?? '#ffffff';
			navFg = w?.navFg ?? '#171717';
			navFont = w?.navFont ?? '';
			navWidth = w?.navReadingMaxWidthPx ?? 320;
		} else if (variant === 'landing') {
			landingBg = w?.landingBg ?? '#ffffff';
			landingFg = w?.landingFg ?? '#171717';
			landingFont = w?.landingFont ?? '';
			landingWidth = w?.landingReadingMaxWidthPx ?? 640;
		} else {
			heroDraftUrl = heroUrl?.trim() ?? '';
			heroFile = null;
			heroPositionY = heroBgPositionYPct ?? 50;
		}
	}

	function captureSnapshot() {
		const w = wysiwyg;
		snapshotTheme = w
			? {
					navBg: w.navBg,
					navFg: w.navFg,
					navFont: w.navFont,
					navReadingMaxWidthPx: w.navReadingMaxWidthPx,
					landingBg: w.landingBg,
					landingFg: w.landingFg,
					landingFont: w.landingFont,
					landingReadingMaxWidthPx: w.landingReadingMaxWidthPx
				}
			: {
					navBg: null,
					navFg: null,
					navFont: null,
					navReadingMaxWidthPx: null,
					landingBg: null,
					landingFg: null,
					landingFont: null,
					landingReadingMaxWidthPx: null
				};
		const hu = heroUrl?.trim();
		snapshotHeroUrl = hu ? hu : null;
		snapshotHeroPositionY = heroBgPositionYPct ?? null;
	}

	function themeSnapshotToApi(t: RentalWysiwygTheme | null) {
		const z = t ?? {
			navBg: null,
			navFg: null,
			navFont: null,
			navReadingMaxWidthPx: null,
			landingBg: null,
			landingFg: null,
			landingFont: null,
			landingReadingMaxWidthPx: null
		};
		return {
			citySlug,
			navBg: z.navBg,
			navFg: z.navFg,
			navFont: z.navFont,
			navReadingMaxWidthPx: z.navReadingMaxWidthPx,
			landingBg: z.landingBg,
			landingFg: z.landingFg,
			landingFont: z.landingFont,
			landingReadingMaxWidthPx: z.landingReadingMaxWidthPx
		};
	}

	function normHex(s: string): string | null {
		const t = s.trim();
		return t || null;
	}

	function emptyToNull(s: string): string | null {
		const t = s.trim();
		return t || null;
	}

	async function persistNavOrLanding() {
		err = null;
		const w = wysiwyg;
		try {
			const res = await fetch('/api/admin/rental-theme', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					citySlug,
					navBg: variant === 'nav' ? normHex(navBg) : w?.navBg ?? null,
					navFg: variant === 'nav' ? normHex(navFg) : w?.navFg ?? null,
					navFont: variant === 'nav' ? emptyToNull(navFont) : w?.navFont ?? null,
					navReadingMaxWidthPx: variant === 'nav' ? navWidth : w?.navReadingMaxWidthPx ?? null,
					landingBg: variant === 'landing' ? normHex(landingBg) : w?.landingBg ?? null,
					landingFg: variant === 'landing' ? normHex(landingFg) : w?.landingFg ?? null,
					landingFont: variant === 'landing' ? emptyToNull(landingFont) : w?.landingFont ?? null,
					landingReadingMaxWidthPx:
						variant === 'landing' ? landingWidth : w?.landingReadingMaxWidthPx ?? null
				})
			});
			const data = (await res.json().catch(() => ({}))) as { message?: string };
			if (!res.ok) {
				err = data.message ?? 'Save failed.';
				return;
			}
			await invalidateAll();
		} catch {
			err = 'Network error.';
		}
	}

	function scheduleNavLandingSave() {
		clearNavLandDebounce();
		debounceNavLand = setTimeout(() => {
			debounceNavLand = null;
			void persistNavOrLanding();
		}, DEBOUNCE_MS);
	}

	async function persistHeroLandingBody(imageUrl: string | null) {
		err = null;
		try {
			const res = await fetch('/api/admin/rental-landing', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					citySlug,
					landingHeroImageUrl: imageUrl,
					landingHeroBgPositionYPct: heroPositionY,
					landingHeadline: headline?.trim() ?? '',
					landingBody: body ?? ''
				})
			});
			const data = (await res.json().catch(() => ({}))) as { message?: string };
			if (!res.ok) {
				err = data.message ?? 'Save failed.';
				return;
			}
			await invalidateAll();
		} catch {
			err = 'Network error.';
		}
	}

	function scheduleHeroSave() {
		clearHeroDebounce();
		debounceHero = setTimeout(() => {
			debounceHero = null;
			const ref = heroDraftUrl.trim();
			void persistHeroLandingBody(ref || null);
		}, DEBOUNCE_MS);
	}

	async function uploadHeroFile(f: File) {
		busy = true;
		err = null;
		try {
			const fd = new FormData();
			fd.set('citySlug', citySlug);
			fd.set('file', f);
			const up = await fetch('/api/admin/rental-hero-upload', {
				method: 'POST',
				body: fd,
				credentials: 'include'
			});
			const upData = (await up.json().catch(() => ({}))) as { path?: string; message?: string };
			if (!up.ok) {
				err = upData.message ?? 'Upload failed.';
				return;
			}
			if (!upData.path) {
				err = 'Upload returned no path.';
				return;
			}
			heroDraftUrl = upData.path;
			heroFile = null;
			await persistHeroLandingBody(upData.path);
		} catch {
			err = 'Network error.';
		} finally {
			busy = false;
		}
	}

	async function keep() {
		clearNavLandDebounce();
		clearHeroDebounce();
		busy = true;
		err = null;
		try {
			if (variant === 'nav' || variant === 'landing') {
				await persistNavOrLanding();
			} else {
				if (heroFile && heroFile.size > 0) {
					await uploadHeroFile(heroFile);
				} else {
					await persistHeroLandingBody(heroDraftUrl.trim() || null);
				}
			}
			open = false;
		} finally {
			busy = false;
		}
	}

	async function cancel() {
		clearNavLandDebounce();
		clearHeroDebounce();
		busy = true;
		err = null;
		try {
			if (variant === 'nav' || variant === 'landing') {
				const res = await fetch('/api/admin/rental-theme', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify(themeSnapshotToApi(snapshotTheme))
				});
				const data = (await res.json().catch(() => ({}))) as { message?: string };
				if (!res.ok) {
					err = data.message ?? 'Revert failed.';
					return;
				}
				await invalidateAll();
			} else {
				const res = await fetch('/api/admin/rental-landing', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify({
						citySlug,
						landingHeroImageUrl: snapshotHeroUrl,
						landingHeroBgPositionYPct: snapshotHeroPositionY,
						landingHeadline: headline?.trim() ?? '',
						landingBody: body ?? ''
					})
				});
				const data = (await res.json().catch(() => ({}))) as { message?: string };
				if (!res.ok) {
					err = data.message ?? 'Revert failed.';
					return;
				}
				await invalidateAll();
			}
			open = false;
		} catch {
			err = 'Network error.';
		} finally {
			busy = false;
		}
	}

	async function onGearClick(e: MouseEvent) {
		e.stopPropagation();
		if (open) {
			await keep();
			return;
		}
		open = true;
		syncDraftsFromProps();
		captureSnapshot();
	}

	function onDocClick(e: MouseEvent) {
		if (!open || !rootEl) return;
		const t = e.target as Node | null;
		if (t && rootEl.contains(t)) return;
		void cancel();
	}

	function onKeyDown(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) void cancel();
	}

	onMount(() => {
		document.addEventListener('click', onDocClick);
		document.addEventListener('keydown', onKeyDown);
		return () => {
			document.removeEventListener('click', onDocClick);
			document.removeEventListener('keydown', onKeyDown);
		};
	});
</script>

<div class="rentalWysiwyg" bind:this={rootEl}>
	<button
		class="rentalWysiwyg__gear"
		type="button"
		aria-expanded={open}
		aria-haspopup="true"
		onclick={onGearClick}
		title="Style & content"
	>
		<svg class="rentalWysiwyg__gearIcon" viewBox="0 0 24 24" aria-hidden="true">
			<path
				fill="currentColor"
				d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.07.63-.07.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"
			/>
		</svg>
		<span class="rentalWysiwyg__sr">Open style menu</span>
	</button>

	{#if open}
		<div class="rentalWysiwyg__panel" role="region" aria-label="Rental style" tabindex="-1">
			{#if variant === 'nav'}
				<h3 class="rentalWysiwyg__title">Navigation column</h3>
				<p class="rentalWysiwyg__hint">Changes save automatically. Keep closes; Cancel reverts this session.</p>
				<label class="rentalWysiwyg__field">
					<span>Background</span>
					<span class="rentalWysiwyg__swatchRow">
						<input
							class="rentalWysiwyg__color"
							type="color"
							bind:value={navBg}
							oninput={scheduleNavLandingSave}
						/>
						<input
							class="rentalWysiwyg__text"
							type="text"
							bind:value={navBg}
							oninput={scheduleNavLandingSave}
						/>
					</span>
				</label>
				<label class="rentalWysiwyg__field">
					<span>Text</span>
					<span class="rentalWysiwyg__swatchRow">
						<input
							class="rentalWysiwyg__color"
							type="color"
							bind:value={navFg}
							oninput={scheduleNavLandingSave}
						/>
						<input
							class="rentalWysiwyg__text"
							type="text"
							bind:value={navFg}
							oninput={scheduleNavLandingSave}
						/>
					</span>
				</label>
				<label class="rentalWysiwyg__field">
					<span>Font</span>
					<select class="rentalWysiwyg__select" bind:value={navFont} onchange={scheduleNavLandingSave}>
						{#each RENTAL_FONT_STACK_OPTIONS as o (o.value)}
							<option value={o.value}>{o.label}</option>
						{/each}
					</select>
				</label>
				<label class="rentalWysiwyg__field">
					<span>Column width (px): {navWidth}</span>
					<input
						type="range"
						min="200"
						max="480"
						step="4"
						bind:value={navWidth}
						oninput={scheduleNavLandingSave}
					/>
				</label>
			{:else if variant === 'landing'}
				<h3 class="rentalWysiwyg__title">Landing content</h3>
				<p class="rentalWysiwyg__hint">Changes save automatically. Keep closes; Cancel reverts this session.</p>
				<label class="rentalWysiwyg__field">
					<span>Background</span>
					<span class="rentalWysiwyg__swatchRow">
						<input
							class="rentalWysiwyg__color"
							type="color"
							bind:value={landingBg}
							oninput={scheduleNavLandingSave}
						/>
						<input
							class="rentalWysiwyg__text"
							type="text"
							bind:value={landingBg}
							oninput={scheduleNavLandingSave}
						/>
					</span>
				</label>
				<label class="rentalWysiwyg__field">
					<span>Text</span>
					<span class="rentalWysiwyg__swatchRow">
						<input
							class="rentalWysiwyg__color"
							type="color"
							bind:value={landingFg}
							oninput={scheduleNavLandingSave}
						/>
						<input
							class="rentalWysiwyg__text"
							type="text"
							bind:value={landingFg}
							oninput={scheduleNavLandingSave}
						/>
					</span>
				</label>
				<label class="rentalWysiwyg__field">
					<span>Font</span>
					<select
						class="rentalWysiwyg__select"
						bind:value={landingFont}
						onchange={scheduleNavLandingSave}
					>
						{#each RENTAL_FONT_STACK_OPTIONS as o (o.value)}
							<option value={o.value}>{o.label}</option>
						{/each}
					</select>
				</label>
				<label class="rentalWysiwyg__field">
					<span>Reading width (px): {landingWidth}</span>
					<input
						type="range"
						min="320"
						max="900"
						step="8"
						bind:value={landingWidth}
						oninput={scheduleNavLandingSave}
					/>
				</label>
			{:else}
				<h3 class="rentalWysiwyg__title">Hero image</h3>
				<p class="rentalWysiwyg__hint">URL saves automatically after you pause typing. Upload applies immediately.</p>
				<label class="rentalWysiwyg__field">
					<span>Image URL (https or /rental-media/…)</span>
					<input
						class="rentalWysiwyg__text"
						type="text"
						autocomplete="off"
						placeholder="https://…"
						bind:value={heroDraftUrl}
						oninput={scheduleHeroSave}
					/>
				</label>
				<label class="rentalWysiwyg__field">
					<span>Or upload</span>
					<input
						class="rentalWysiwyg__file"
						type="file"
						accept="image/jpeg,image/png,image/webp,image/gif"
						onchange={(e) => {
							const f = e.currentTarget.files?.[0];
							heroFile = f ?? null;
							if (f) void uploadHeroFile(f);
						}}
					/>
				</label>
				<label class="rentalWysiwyg__field">
					<span>Vertical focus (0 = top, 50 = center, 100 = bottom): {heroPositionY}</span>
					<input
						type="range"
						min="0"
						max="100"
						step="1"
						bind:value={heroPositionY}
						oninput={scheduleHeroSave}
					/>
				</label>
			{/if}

			{#if err}
				<p class="rentalWysiwyg__err" role="alert">{err}</p>
			{/if}

			<div class="rentalWysiwyg__actions">
				<button class="rentalWysiwyg__btn" type="button" disabled={busy} onclick={() => keep()}>
					{busy ? 'Working…' : 'Keep'}
				</button>
				<button
					class="rentalWysiwyg__btn rentalWysiwyg__btn--ghost"
					type="button"
					disabled={busy}
					onclick={() => cancel()}
				>
					Cancel
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.rentalWysiwyg {
		position: absolute;
		top: 0.35rem;
		left: 0.35rem;
		z-index: 20;
	}

	.rentalWysiwyg__gear {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		padding: 0;
		border-radius: 0.35rem;
		border: 1px solid #d4d4d4;
		background: #fff;
		color: #262626;
		cursor: pointer;
		box-shadow: 0 1px 3px rgb(0 0 0 / 0.12);
	}

	.rentalWysiwyg__gear:hover {
		background: #f5f5f5;
	}

	.rentalWysiwyg__gearIcon {
		width: 1.25rem;
		height: 1.25rem;
		display: block;
	}

	.rentalWysiwyg__sr {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		border: 0;
	}

	.rentalWysiwyg__panel {
		position: absolute;
		top: 2.5rem;
		left: 0;
		width: min(22rem, calc(100vw - 2rem));
		padding: 1rem;
		border-radius: 0.5rem;
		border: 1px solid #d4d4d4;
		background: #fff;
		color: #171717;
		box-shadow: 0 12px 40px rgb(0 0 0 / 0.18);
		font-size: 0.9rem;
	}

	.rentalWysiwyg__title {
		margin: 0 0 0.35rem;
		font-size: 1rem;
		font-weight: 650;
	}

	.rentalWysiwyg__hint {
		margin: 0 0 0.75rem;
		font-size: 0.78rem;
		line-height: 1.35;
		color: #525252;
	}

	.rentalWysiwyg__field {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		margin-bottom: 0.75rem;
	}

	.rentalWysiwyg__field > span:first-child {
		font-weight: 600;
		font-size: 0.8rem;
		color: #404040;
	}

	.rentalWysiwyg__swatchRow {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.rentalWysiwyg__color {
		width: 2.5rem;
		height: 2rem;
		padding: 0;
		border: 1px solid #a3a3a3;
		border-radius: 0.25rem;
		cursor: pointer;
	}

	.rentalWysiwyg__text {
		flex: 1;
		min-width: 0;
		font: inherit;
		font-size: 0.88rem;
		padding: 0.35rem 0.45rem;
		border: 1px solid #a3a3a3;
		border-radius: 0.25rem;
	}

	.rentalWysiwyg__select {
		font: inherit;
		font-size: 0.88rem;
		padding: 0.4rem 0.45rem;
		border: 1px solid #a3a3a3;
		border-radius: 0.25rem;
		background: #fff;
		color: #171717;
	}

	.rentalWysiwyg__file {
		font-size: 0.85rem;
	}

	.rentalWysiwyg__err {
		margin: 0 0 0.5rem;
		font-size: 0.85rem;
		color: #b91c1c;
	}

	.rentalWysiwyg__actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}

	.rentalWysiwyg__btn {
		appearance: none;
		font: inherit;
		font-weight: 650;
		font-size: 0.85rem;
		padding: 0.4rem 0.75rem;
		border-radius: 0.35rem;
		border: 1px solid #525252;
		background: #f5f5f5;
		color: #171717;
		cursor: pointer;
	}

	.rentalWysiwyg__btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.rentalWysiwyg__btn--ghost {
		background: #fff;
		font-weight: 550;
	}
</style>
