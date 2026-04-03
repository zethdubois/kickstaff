<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { cities, isCitySlug, type CitySlug } from '$lib/cities';

	let { data, form } = $props();

	function slugFromUrl(url: URL): CitySlug {
		const q = url.searchParams.get('city');
		return q && isCitySlug(q) ? q : cities[0].slug;
	}

	let activeCity = $state<CitySlug>(slugFromUrl(page.url));

	$effect(() => {
		activeCity = slugFromUrl(page.url);
	});

	$effect(() => {
		if (!form?.saved || !form?.city || !isCitySlug(form.city)) return;
		if (page.url.searchParams.get('city') === form.city) return;
		void goto(`?city=${form.city}`, { replaceState: true, noScroll: true, keepFocus: true });
	});

	function selectTab(slug: CitySlug) {
		void goto(`?city=${slug}`, { replaceState: true, noScroll: true, keepFocus: true });
	}

	function onTabKeydown(e: KeyboardEvent, index: number) {
		const n = data.cities.length;
		if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
			e.preventDefault();
			const dir = e.key === 'ArrowRight' ? 1 : -1;
			const next = (index + dir + n) % n;
			const slug = data.cities[next].slug;
			selectTab(slug);
			queueMicrotask(() => document.getElementById(`rental-tab-${slug}`)?.focus());
		} else if (e.key === 'Home') {
			e.preventDefault();
			const slug = data.cities[0].slug;
			selectTab(slug);
			queueMicrotask(() => document.getElementById(`rental-tab-${slug}`)?.focus());
		} else if (e.key === 'End') {
			e.preventDefault();
			const slug = data.cities[n - 1].slug;
			selectTab(slug);
			queueMicrotask(() => document.getElementById(`rental-tab-${slug}`)?.focus());
		}
	}
</script>

<svelte:head>
	<title>Rental links</title>
</svelte:head>

<div class="admin">
	<nav class="admin__nav" aria-label="Admin">
		<span class="admin__navCurrent">Rental links</span>
		<span class="admin__navSep" aria-hidden="true">·</span>
		<a class="admin__navLink" href="/admin/users">Users</a>
	</nav>

	<h1 class="admin__title">Rental landing links</h1>
	<p class="admin__lead">
		AppFolio URLs for each city page (<code>/cda</code>, <code>/mos</code>,
		<code>/spt</code>). Leave a URL field empty to hide that tile. URLs must use
		<code>https://</code>. The <strong>embedded listings</strong> field is the AppFolio
		<em>property group</em> for the on-page iframe (same as the AppFolio
		<code>Appfolio.Listing</code> <code>propertyGroup</code> option). Optional <strong>theme color</strong>
		and <strong>sort order</strong> match <code>themeColor</code> and <code>defaultOrder</code>; leave
		blank for defaults (<code>#95bb3e</code> and <code>date_posted</code>). Use
		<strong>landing hero / headline / body</strong> for the main column when no listing iframe is open
		(hero image must be <code>https://</code>).
	</p>

	{#if form?.message && !form?.city}
		<p class="admin__err" role="alert">{form.message}</p>
	{/if}

	<div class="cityTabs">
		<div class="cityTabs__list" role="tablist" aria-label="City">
			{#each data.cities as c, i (c.slug)}
				<button
					type="button"
					id="rental-tab-{c.slug}"
					class="cityTabs__tab"
					class:cityTabs__tab--active={activeCity === c.slug}
					role="tab"
					aria-selected={activeCity === c.slug}
					aria-controls="rental-panel-{c.slug}"
					tabindex={activeCity === c.slug ? 0 : -1}
					onclick={() => selectTab(c.slug)}
					onkeydown={(e) => onTabKeydown(e, i)}
				>
					{c.label}
				</button>
			{/each}
		</div>

		{#each data.cities as c (c.slug)}
			<div
				class="cityTabs__panel"
				id="rental-panel-{c.slug}"
				role="tabpanel"
				aria-labelledby="rental-tab-{c.slug}"
				hidden={activeCity !== c.slug}
			>
				{#if form?.message && form?.city === c.slug}
					<p class="admin__err" role="alert">{form.message}</p>
				{/if}
				{#if form?.saved && form?.city === c.slug}
					<p class="admin__ok" role="status">Saved links for {c.label}.</p>
				{/if}
				<form method="POST" action="?/save" class="admin__form">
					<input type="hidden" name="city" value={c.slug} />
					<label class="field">
						<span class="field__label">Short-term listings</span>
						<input
							class="field__input"
							name="short_term_url"
							type="url"
							inputmode="url"
							autocomplete="off"
							placeholder="https://…"
							value={c.shortTermUrl}
						/>
					</label>
					<label class="field">
						<span class="field__label">Long-term listings</span>
						<input
							class="field__input"
							name="long_term_url"
							type="url"
							inputmode="url"
							autocomplete="off"
							placeholder="https://…"
							value={c.longTermUrl}
						/>
					</label>
					<label class="field">
						<span class="field__label">Apply</span>
						<input
							class="field__input"
							name="apply_url"
							type="url"
							inputmode="url"
							autocomplete="off"
							placeholder="https://…"
							value={c.applyUrl}
						/>
					</label>
					<label class="field">
						<span class="field__label">Contact</span>
						<input
							class="field__input"
							name="contact_url"
							type="url"
							inputmode="url"
							autocomplete="off"
							placeholder="https://…"
							value={c.contactUrl}
						/>
					</label>
					<label class="field">
						<span class="field__label">Embedded listings (property group name)</span>
						<input
							class="field__input"
							name="listing_property_group"
							type="text"
							autocomplete="off"
							placeholder="e.g. Moscow"
							value={c.listingPropertyGroup}
						/>
					</label>
					<label class="field">
						<span class="field__label">Listing theme color (hex)</span>
						<input
							class="field__input"
							name="listing_theme_color"
							type="text"
							autocomplete="off"
							placeholder="#95bb3e"
							value={c.listingThemeColor}
						/>
					</label>
					<label class="field">
						<span class="field__label">Listing sort (<code>defaultOrder</code>)</span>
						<input
							class="field__input"
							name="listing_order_by"
							type="text"
							autocomplete="off"
							placeholder="date_posted"
							value={c.listingOrderBy}
						/>
					</label>
					<h3 class="cityTabs__sectionTitle">Landing content (main column)</h3>
					<label class="field">
						<span class="field__label">Landing hero image URL</span>
						<input
							class="field__input"
							name="landing_hero_image_url"
							type="url"
							inputmode="url"
							autocomplete="off"
							placeholder="https://…"
							value={c.landingHeroImageUrl}
						/>
					</label>
					<label class="field">
						<span class="field__label">Landing headline</span>
						<input
							class="field__input"
							name="landing_headline"
							type="text"
							autocomplete="off"
							value={c.landingHeadline}
						/>
					</label>
					<label class="field">
						<span class="field__label">Landing body</span>
						<textarea
							class="field__input field__input--textarea"
							name="landing_body"
							rows="6"
							autocomplete="off"
							placeholder="Plain text; line breaks are preserved."
						>{c.landingBody}</textarea>
					</label>
					<button class="btn" type="submit">Save {c.label}</button>
				</form>
			</div>
		{/each}
	</div>
</div>

<style>
	.admin {
		max-width: 40rem;
		margin: 0 auto;
		padding: 1.5rem 1.25rem 3rem;
	}

	.admin__nav {
		margin-bottom: 1rem;
		font-size: 0.9rem;
		color: color-mix(in srgb, currentColor 72%, transparent);
	}

	.admin__navLink {
		color: inherit;
		text-decoration: underline;
		text-underline-offset: 0.12em;
	}

	.admin__navSep {
		margin: 0 0.35rem;
	}

	.admin__navCurrent {
		font-weight: 600;
		color: color-mix(in srgb, currentColor 88%, transparent);
	}

	.admin__title {
		margin: 0 0 0.35rem;
		font-size: 1.5rem;
		font-weight: 700;
	}

	.admin__lead {
		margin: 0 0 1.5rem;
		color: color-mix(in srgb, currentColor 72%, transparent);
		font-size: 0.95rem;
		line-height: 1.45;
	}

	.admin__lead code {
		font-size: 0.88em;
	}

	.admin__err {
		margin: 0 0 1rem;
		padding: 0.5rem 0.65rem;
		border-radius: 10px;
		background: color-mix(in srgb, #c0392b 12%, transparent);
		font-size: 0.9rem;
	}

	.admin__ok {
		margin: 0 0 1rem;
		padding: 0.5rem 0.65rem;
		border-radius: 10px;
		background: color-mix(in srgb, #1e8449 14%, transparent);
		font-size: 0.9rem;
	}

	.cityTabs {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.cityTabs__list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 0.5rem;
		border-bottom: 1px solid color-mix(in srgb, currentColor 14%, transparent);
		padding-bottom: 0.35rem;
	}

	.cityTabs__tab {
		appearance: none;
		font: inherit;
		cursor: pointer;
		padding: 0.4rem 0.55rem;
		margin: 0;
		border: none;
		border-bottom: 2px solid transparent;
		background: transparent;
		color: color-mix(in srgb, currentColor 72%, transparent);
		font-weight: 600;
		font-size: 0.92rem;
		border-radius: 8px 8px 0 0;
	}

	.cityTabs__tab:hover {
		color: color-mix(in srgb, currentColor 88%, transparent);
		background: color-mix(in srgb, currentColor 6%, transparent);
	}

	.cityTabs__tab:focus {
		outline: none;
	}

	.cityTabs__tab:focus-visible {
		outline: 2px solid currentColor;
		outline-offset: 2px;
	}

	.cityTabs__tab--active {
		color: color-mix(in srgb, currentColor 95%, transparent);
		border-bottom-color: color-mix(in srgb, currentColor 45%, transparent);
	}

	.cityTabs__panel {
		min-width: 0;
	}

	.cityTabs__sectionTitle {
		margin: 0.5rem 0 0;
		font-size: 0.95rem;
		font-weight: 650;
		color: color-mix(in srgb, currentColor 78%, transparent);
	}

	.admin__form {
		display: grid;
		gap: 0.75rem;
		max-width: 28rem;
	}

	.field {
		display: grid;
		gap: 0.25rem;
	}

	.field__label {
		font-size: 0.82rem;
		font-weight: 600;
	}

	.field__input {
		font: inherit;
		padding: 0.45rem 0.55rem;
		border-radius: 10px;
		border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
	}

	.field__input--textarea {
		resize: vertical;
		min-height: 6rem;
		line-height: 1.45;
	}

	.btn {
		appearance: none;
		justify-self: start;
		font: inherit;
		padding: 0.45rem 0.85rem;
		border-radius: 10px;
		border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
		background: color-mix(in srgb, currentColor 10%, transparent);
		cursor: pointer;
		font-weight: 650;
		margin-top: 0.25rem;
	}
</style>
