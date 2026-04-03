<script lang="ts">
  let { form } = $props();
</script>

<svelte:head>
  <title>Add link — Settings</title>
</svelte:head>

<div class="addLink">
  <nav class="addLink__nav" aria-label="Settings">
    <a class="addLink__back" href="/">← Home</a>
  </nav>

  <h1 class="addLink__title">Add dashboard link</h1>
  <p class="addLink__lead">
    New links appear for everyone on the home page. You can hide a link from
    your own view on the Dashboard tab.
  </p>

  {#if form?.message}
    <p class="addLink__err" role="alert">{form.message}</p>
  {/if}

  <form method="POST" action="?/create" class="addLink__form">
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
</div>

<style>
  .addLink__nav {
    margin-bottom: 0.75rem;
    font-size: 0.9rem;
  }

  .addLink__back {
    color: inherit;
    text-decoration: underline;
    text-underline-offset: 0.12em;
  }

  .addLink__title {
    margin: 0 0 0.35rem;
    font-size: 1.45rem;
    font-weight: 700;
  }

  .addLink__lead {
    margin: 0 0 1.25rem;
    color: color-mix(in srgb, currentColor 72%, transparent);
    font-size: 0.95rem;
    max-width: 40rem;
  }

  .addLink__err {
    margin: 0 0 1rem;
    padding: 0.5rem 0.65rem;
    border-radius: 10px;
    background: color-mix(in srgb, #c0392b 12%, transparent);
    font-size: 0.9rem;
  }

  .addLink__form {
    display: grid;
    gap: 0.65rem;
    max-width: 28rem;
  }

  .field {
    display: grid;
    gap: 0.25rem;
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
</style>
