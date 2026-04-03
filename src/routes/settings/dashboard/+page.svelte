<script lang="ts">
  let { data, form } = $props();
</script>

<svelte:head>
  <title>Dashboard links — Settings</title>
</svelte:head>

<div class="dashSettings">
  <nav class="dashSettings__nav" aria-label="Settings">
    <a class="dashSettings__back" href="/">← Home</a>
  </nav>

  <h1 class="dashSettings__title">Dashboard links</h1>
  <p class="dashSettings__lead">
    Links here appear on the home page for everyone, grouped by category. Use
    <strong>Show on my dashboard</strong> to hide a link from your own view
    only.
  </p>

  {#if form?.message}
    <p class="dashSettings__err" role="alert">{form.message}</p>
  {/if}

  {#if form?.ok}
    <p class="dashSettings__ok" role="status">Saved.</p>
  {/if}

  <section class="dashSettings__section" aria-label="Add link">
    <h2 class="dashSettings__h2">Add link</h2>
    <form method="POST" action="?/create" class="dashSettings__form">
      <label class="field">
        <span class="field__label">Label</span>
        <input class="field__input" name="label" required maxlength="512" />
      </label>
      <label class="field">
        <span class="field__label">Description</span>
        <textarea class="field__input field__textarea" name="description" rows="2" maxlength="4096"></textarea>
      </label>
      <label class="field">
        <span class="field__label">Hyperlink (https://…)</span>
        <input class="field__input" name="hyperlink" type="url" required maxlength="2048" />
      </label>
      <label class="field">
        <span class="field__label">Category</span>
        <input class="field__input" name="category" required maxlength="128" placeholder="e.g. Sheets, Tools" />
      </label>
      <label class="field">
        <span class="field__label">Sort order</span>
        <input
          class="field__input"
          name="sort_order"
          type="number"
          value="0"
          step="1"
        />
      </label>
      <button class="btn" type="submit">Add link</button>
    </form>
  </section>

  <section class="dashSettings__section" aria-label="Existing links">
    <h2 class="dashSettings__h2">Existing links</h2>
    {#if data.links.length === 0}
      <p class="dashSettings__empty">No links yet.</p>
    {:else}
      <ul class="linkList">
        {#each data.links as l (l.id)}
          <li class="linkCard">
            <div class="linkCard__head">
              <span class="linkCard__title">{l.label}</span>
              <span class="linkCard__cat">{l.category}</span>
            </div>
            <p class="linkCard__desc">{l.description}</p>
            <p class="linkCard__url">
              <a href={l.hyperlink} target="_blank" rel="noreferrer">{l.hyperlink}</a>
            </p>

            <div class="linkCard__myRow">
              {#if l.showOnMyDashboard}
                <form method="POST" action="?/toggle" class="linkCard__toggleForm">
                  <input type="hidden" name="link_id" value={l.id} />
                  <input type="hidden" name="show" value="0" />
                  <button class="btn btn--small" type="submit">
                    Hide from my dashboard
                  </button>
                </form>
              {:else}
                <form method="POST" action="?/toggle" class="linkCard__toggleForm">
                  <input type="hidden" name="link_id" value={l.id} />
                  <input type="hidden" name="show" value="1" />
                  <button class="btn btn--small" type="submit">
                    Show on my dashboard
                  </button>
                </form>
              {/if}
            </div>

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
    max-width: 40rem;
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

  .dashSettings__section {
    margin-bottom: 2rem;
  }

  .dashSettings__h2 {
    font-size: 1.05rem;
    margin: 0 0 0.65rem;
  }

  .dashSettings__empty {
    margin: 0;
    color: color-mix(in srgb, currentColor 65%, transparent);
    font-size: 0.95rem;
  }

  .dashSettings__form {
    display: grid;
    gap: 0.65rem;
    max-width: 28rem;
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

  .linkList {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .linkCard {
    padding: 1rem;
    border-radius: 12px;
    border: 1px solid color-mix(in srgb, currentColor 14%, transparent);
    background: color-mix(in srgb, currentColor 3%, transparent);
  }

  .linkCard__head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.5rem 0.75rem;
    margin-bottom: 0.35rem;
  }

  .linkCard__title {
    font-weight: 650;
    font-size: 1.02rem;
  }

  .linkCard__cat {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: color-mix(in srgb, currentColor 55%, transparent);
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

  .linkCard__myRow {
    margin-bottom: 0.75rem;
  }

  .linkCard__toggleForm {
    display: inline;
    margin: 0;
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

  .linkCard__deleteForm {
    margin: 0;
  }
</style>
