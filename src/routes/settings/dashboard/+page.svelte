<script lang="ts">
  import {
    categoryBorder,
    categoryForeground,
    categoryTintBackground,
    hashCategoryHue
  } from "$lib/categoryColor";

  let { data, form } = $props();
</script>

<svelte:head>
  <title>Dashboard links — Settings</title>
</svelte:head>

<div class="dashSettings">
  <nav class="dashSettings__nav" aria-label="Settings">
    <a class="dashSettings__back" href="/">← Home</a>
  </nav>

  <h1 class="dashSettings__title">Dashboard</h1>
  <p class="dashSettings__lead">
    Edit links or choose what appears on <strong>your</strong> home page. To add
    a new link for everyone, use the <a href="/settings/add-link">Add link</a> tab.
  </p>

  {#if form?.message}
    <p class="dashSettings__err" role="alert">{form.message}</p>
  {/if}

  {#if form?.ok}
    <p class="dashSettings__ok" role="status">Saved.</p>
  {/if}

  <div class="dashCols" aria-label="Your dashboard visibility">
    <section class="dashCol" aria-labelledby="dash-col-on">
      <h2 id="dash-col-on" class="dashCol__heading">On my dashboard</h2>
      {#if data.selectedLinks.length === 0}
        <p class="dashCol__empty">No links selected. Use “Show” on the right or add links under <a href="/settings/add-link">Add link</a>.</p>
      {:else}
        <ul class="linkList">
          {#each data.selectedLinks as l (l.id)}
            {@const hue = hashCategoryHue(l.category)}
            <li
              class="linkCard"
              style="background-color: {categoryTintBackground(hue)}; border: 1px solid {categoryBorder(hue)};"
            >
              <div class="linkCard__toolbar">
                <span
                  class="linkCard__cat"
                  style="color: {categoryForeground(hue)}; border-color: {categoryBorder(hue)}; background: hsla({hue}deg 45% 97% / 0.95);"
                  >{l.category}</span
                >
                <form method="POST" action="?/toggle" class="linkCard__toggle">
                  <input type="hidden" name="link_id" value={l.id} />
                  <input type="hidden" name="show" value="0" />
                  <button
                    class="linkCard__toggleBtn"
                    type="submit"
                    title="Hide from my dashboard"
                  >
                    Hide
                  </button>
                </form>
              </div>
              <div class="linkCard__titleRow">
                <span class="linkCard__title">{l.label}</span>
              </div>
              <p class="linkCard__desc">{l.description}</p>
              <p class="linkCard__url">
                <a href={l.hyperlink} target="_blank" rel="noreferrer">{l.hyperlink}</a>
              </p>

              <form method="POST" action="?/update" class="linkCard__edit">
                <input type="hidden" name="link_id" value={l.id} />
                <div class="linkCard__editGrid">
                  <label class="field field--inline">
                    <span class="field__label">Label</span>
                    <input class="field__input" name="label" value={l.label} required maxlength="512" />
                  </label>
                  <label class="field field--inline">
                    <span class="field__label">Category</span>
                    <input class="field__input" name="category" value={l.category} required maxlength="128" />
                  </label>
                  <label class="field field--full">
                    <span class="field__label">Description</span>
                    <textarea class="field__input field__textarea" name="description" rows="2" maxlength="4096">{l.description}</textarea>
                  </label>
                  <label class="field field--full">
                    <span class="field__label">Hyperlink</span>
                    <input class="field__input" name="hyperlink" type="url" value={l.hyperlink} required maxlength="2048" />
                  </label>
                  <label class="field field--inline">
                    <span class="field__label">Sort order</span>
                    <input
                      class="field__input"
                      name="sort_order"
                      type="number"
                      value={l.sortOrder}
                      step="1"
                    />
                  </label>
                </div>
                <button class="btn" type="submit">Save changes</button>
              </form>

              <form method="POST" action="?/delete" class="linkCard__deleteForm">
                <input type="hidden" name="link_id" value={l.id} />
                <button
                  class="btn btn--small btn--danger"
                  type="submit"
                  onclick={(e) => {
                    if (!confirm("Delete this link for everyone?")) e.preventDefault();
                  }}
                >
                  Delete link
                </button>
              </form>
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    <section class="dashCol" aria-labelledby="dash-col-off">
      <h2 id="dash-col-off" class="dashCol__heading">Hidden for me</h2>
      {#if data.hiddenLinks.length === 0}
        <p class="dashCol__empty">Nothing hidden. Use “Hide” on a card to remove it from your home page only.</p>
      {:else}
        <ul class="linkList">
          {#each data.hiddenLinks as l (l.id)}
            {@const hue = hashCategoryHue(l.category)}
            <li
              class="linkCard linkCard--muted"
              style="background-color: {categoryTintBackground(hue)}; border: 1px solid {categoryBorder(hue)};"
            >
              <div class="linkCard__toolbar">
                <span
                  class="linkCard__cat"
                  style="color: {categoryForeground(hue)}; border-color: {categoryBorder(hue)}; background: hsla({hue}deg 40% 96% / 0.9);"
                  >{l.category}</span
                >
                <form method="POST" action="?/toggle" class="linkCard__toggle">
                  <input type="hidden" name="link_id" value={l.id} />
                  <input type="hidden" name="show" value="1" />
                  <button
                    class="linkCard__toggleBtn"
                    type="submit"
                    title="Show on my dashboard"
                  >
                    Show
                  </button>
                </form>
              </div>
              <div class="linkCard__titleRow">
                <span class="linkCard__title">{l.label}</span>
              </div>
              <p class="linkCard__desc">{l.description}</p>
              <p class="linkCard__url">
                <a href={l.hyperlink} target="_blank" rel="noreferrer">{l.hyperlink}</a>
              </p>

              <form method="POST" action="?/update" class="linkCard__edit">
                <input type="hidden" name="link_id" value={l.id} />
                <div class="linkCard__editGrid">
                  <label class="field field--inline">
                    <span class="field__label">Label</span>
                    <input class="field__input" name="label" value={l.label} required maxlength="512" />
                  </label>
                  <label class="field field--inline">
                    <span class="field__label">Category</span>
                    <input class="field__input" name="category" value={l.category} required maxlength="128" />
                  </label>
                  <label class="field field--full">
                    <span class="field__label">Description</span>
                    <textarea class="field__input field__textarea" name="description" rows="2" maxlength="4096">{l.description}</textarea>
                  </label>
                  <label class="field field--full">
                    <span class="field__label">Hyperlink</span>
                    <input class="field__input" name="hyperlink" type="url" value={l.hyperlink} required maxlength="2048" />
                  </label>
                  <label class="field field--inline">
                    <span class="field__label">Sort order</span>
                    <input
                      class="field__input"
                      name="sort_order"
                      type="number"
                      value={l.sortOrder}
                      step="1"
                    />
                  </label>
                </div>
                <button class="btn" type="submit">Save changes</button>
              </form>

              <form method="POST" action="?/delete" class="linkCard__deleteForm">
                <input type="hidden" name="link_id" value={l.id} />
                <button
                  class="btn btn--small btn--danger"
                  type="submit"
                  onclick={(e) => {
                    if (!confirm("Delete this link for everyone?")) e.preventDefault();
                  }}
                >
                  Delete link
                </button>
              </form>
            </li>
          {/each}
        </ul>
      {/if}
    </section>
  </div>
</div>

<style>
  .dashSettings__nav {
    margin-bottom: 0.75rem;
    font-size: 0.9rem;
  }

  .dashSettings__back {
    color: inherit;
    text-decoration: underline;
    text-underline-offset: 0.12em;
  }

  .dashSettings__title {
    margin: 0 0 0.35rem;
    font-size: 1.45rem;
    font-weight: 700;
  }

  .dashSettings__lead {
    margin: 0 0 1.25rem;
    color: color-mix(in srgb, currentColor 72%, transparent);
    font-size: 0.95rem;
    max-width: 44rem;
  }

  .dashSettings__lead a {
    color: inherit;
    font-weight: 600;
  }

  .dashSettings__err {
    margin: 0 0 1rem;
    padding: 0.5rem 0.65rem;
    border-radius: 10px;
    background: color-mix(in srgb, #c0392b 12%, transparent);
    font-size: 0.9rem;
  }

  .dashSettings__ok {
    margin: 0 0 1rem;
    padding: 0.5rem 0.65rem;
    border-radius: 10px;
    background: color-mix(in srgb, #27ae60 10%, transparent);
    font-size: 0.9rem;
  }

  .dashCols {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.25rem 1.5rem;
    align-items: start;
  }

  @media (max-width: 720px) {
    .dashCols {
      grid-template-columns: 1fr;
    }
  }

  .dashCol__heading {
    margin: 0 0 0.65rem;
    font-size: 1rem;
    font-weight: 700;
  }

  .dashCol__empty {
    margin: 0;
    font-size: 0.92rem;
    color: color-mix(in srgb, currentColor 68%, transparent);
    line-height: 1.45;
  }

  .dashCol__empty a {
    color: inherit;
    font-weight: 600;
  }

  .linkList {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .linkCard {
    position: relative;
    padding: 1rem;
    padding-top: 0.85rem;
    border-radius: 12px;
  }

  .linkCard--muted {
    opacity: 0.92;
  }

  .linkCard__toolbar {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.4rem;
    min-height: 1.75rem;
  }

  .linkCard__cat {
    font-size: 0.68rem;
    font-weight: 750;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    padding: 0.2rem 0.45rem;
    border-radius: 6px;
    border: 1px solid;
    max-width: calc(100% - 4.5rem);
    overflow-wrap: anywhere;
  }

  .linkCard__toggle {
    flex-shrink: 0;
    margin: 0;
    margin-left: auto;
  }

  .linkCard__toggleBtn {
    appearance: none;
    font: inherit;
    font-size: 0.78rem;
    font-weight: 650;
    padding: 0.25rem 0.5rem;
    border-radius: 8px;
    border: 1px solid color-mix(in srgb, currentColor 22%, transparent);
    background: color-mix(in srgb, currentColor 8%, transparent);
    cursor: pointer;
    color: inherit;
  }

  .linkCard__toggleBtn:hover {
    background: color-mix(in srgb, currentColor 14%, transparent);
  }

  .linkCard__titleRow {
    margin-bottom: 0.25rem;
  }

  .linkCard__title {
    font-weight: 650;
    font-size: 1.02rem;
  }

  .linkCard__desc {
    margin: 0 0 0.35rem;
    font-size: 0.92rem;
    color: color-mix(in srgb, currentColor 78%, transparent);
  }

  .linkCard__url {
    margin: 0 0 0.65rem;
    font-size: 0.85rem;
    overflow-wrap: anywhere;
  }

  .linkCard__url a {
    color: inherit;
  }

  .linkCard__edit {
    margin: 0 0 0.65rem;
    padding-top: 0.75rem;
    border-top: 1px solid color-mix(in srgb, currentColor 10%, transparent);
  }

  .linkCard__editGrid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.55rem 0.75rem;
    margin-bottom: 0.55rem;
  }

  @media (max-width: 520px) {
    .linkCard__editGrid {
      grid-template-columns: 1fr;
    }
  }

  .field {
    display: grid;
    gap: 0.25rem;
  }

  .field--inline {
    min-width: 0;
  }

  .field--full {
    grid-column: 1 / -1;
  }

  .field__label {
    font-size: 0.78rem;
    font-weight: 600;
  }

  .field__input {
    font: inherit;
    padding: 0.4rem 0.5rem;
    border-radius: 8px;
    border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
  }

  .field__textarea {
    resize: vertical;
    min-height: 2.5rem;
  }

  .btn {
    appearance: none;
    justify-self: start;
    font: inherit;
    padding: 0.4rem 0.75rem;
    border-radius: 10px;
    border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
    background: color-mix(in srgb, currentColor 10%, transparent);
    cursor: pointer;
    font-weight: 650;
  }

  .btn--small {
    font-size: 0.82rem;
    padding: 0.3rem 0.55rem;
    font-weight: 600;
  }

  .btn--danger {
    border-color: color-mix(in srgb, #c0392b 45%, transparent);
    background: color-mix(in srgb, #c0392b 10%, transparent);
  }

  .linkCard__deleteForm {
    margin: 0;
  }
</style>
