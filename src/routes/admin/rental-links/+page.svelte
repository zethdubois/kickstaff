<script lang="ts">
  let { data, form } = $props();
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
    blank for defaults (<code>#95bb3e</code> and <code>date_posted</code>).
  </p>

  {#if form?.message && !form?.city}
    <p class="admin__err" role="alert">{form.message}</p>
  {/if}

  {#if form?.saved && form?.city}
    <p class="admin__ok" role="status">Saved links for {form.city}.</p>
  {/if}

  {#each data.cities as c (c.slug)}
    <section class="city" aria-labelledby="city-{c.slug}">
      <h2 class="city__title" id="city-{c.slug}">{c.label}</h2>
      {#if form?.message && form?.city === c.slug}
        <p class="admin__err" role="alert">{form.message}</p>
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
        <button class="btn" type="submit">Save {c.label}</button>
      </form>
    </section>
  {/each}
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

  .city {
    margin-bottom: 2rem;
    padding-bottom: 2rem;
    border-bottom: 1px solid color-mix(in srgb, currentColor 12%, transparent);
  }

  .city:last-child {
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: none;
  }

  .city__title {
    margin: 0 0 0.75rem;
    font-size: 1.15rem;
    font-weight: 650;
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
