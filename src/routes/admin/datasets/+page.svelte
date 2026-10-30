<!--
  @docs: docs/sop-svelte-and-components.md
  @faq: docs/guides/database-targeting.md
-->
<script lang="ts">
  let { data, form } = $props();
</script>

<svelte:head>
  <title>Ops datasets</title>
</svelte:head>

<div class="admin">
  <nav class="admin__nav" aria-label="Admin">
    <a class="admin__navLink" href="/admin/rental-links">Rental links</a>
    <span class="admin__navSep" aria-hidden="true">·</span>
    <a class="admin__navLink" href="/admin/users">Users</a>
    <span class="admin__navSep" aria-hidden="true">·</span>
    <span class="admin__navCurrent">Datasets</span>
  </nav>

  <h1 class="admin__title">Ops datasets</h1>
  <p class="admin__lead">
    Connection strings for Kickagent data commands. They live as rows in the
    <strong>product</strong> database. The browser never receives the URL — only
    the dataset <code>name</code>. After save, the form shows that a secret is
    set; leave the field blank to keep the existing value. Seed once from env
    path rewrite (<code>kickstaff_dev</code> → <code>kickagent_ops_dev</code>).
    Non-admin grants: insert into <code>ops_dataset_grants</code> (SQL is enough
    for v1).
  </p>

  {#if form?.message}
    <p class="admin__err" role="alert">{form.message}</p>
  {/if}

  {#if form?.seeded}
    <div class="admin__banner admin__banner--ok" role="status">
      <div class="admin__bannerTitle">Seed complete</div>
      <p class="admin__bannerMeta">
        Inserted {form.inserted}
        {#if form.names?.length}
          ({form.names.join(", ")})
        {/if}
      </p>
    </div>
  {/if}

  {#if form?.saved && form?.name}
    <div class="admin__banner admin__banner--ok" role="status">
      <div class="admin__bannerTitle">Saved</div>
      <p class="admin__bannerMeta">Dataset <strong>{form.name}</strong> updated.</p>
    </div>
  {/if}

  {#if data.autoSeeded.length > 0}
    <div class="admin__banner admin__banner--ok" role="status">
      <div class="admin__bannerTitle">Auto-seeded</div>
      <p class="admin__bannerMeta">
        Created {data.autoSeeded.join(", ")} from product URL path rewrite.
      </p>
    </div>
  {/if}

  <form method="POST" action="?/seed" class="admin__toolbar">
    <button class="btn btn--secondary" type="submit">Seed missing from env</button>
  </form>

  <section class="admin__section" aria-labelledby="existing-heading">
    <h2 id="existing-heading" class="admin__h2">Configured datasets</h2>
    {#if data.datasets.length === 0}
      <p class="admin__empty">No rows yet. Seed from env or create one below.</p>
    {:else}
      <ul class="dataset-list">
        {#each data.datasets as ds (ds.id)}
          <li class="dataset-card">
            <form method="POST" action="?/update" class="admin__form dataset-card__form">
              <input type="hidden" name="id" value={ds.id} />
              <label class="field">
                <span class="field__label">Name</span>
                <input
                  class="field__input"
                  name="name"
                  value={ds.name}
                  required
                  pattern="[a-z][a-z0-9-]*"
                  autocomplete="off"
                />
              </label>
              <label class="field">
                <span class="field__label">Label</span>
                <input
                  class="field__input"
                  name="label"
                  value={ds.label}
                  required
                  autocomplete="off"
                />
              </label>
              <label class="field">
                <span class="field__label">
                  Connection string
                  {#if ds.hasConnectionString}
                    <span class="field__hint">(set — leave blank to keep)</span>
                  {/if}
                </span>
                <input
                  class="field__input"
                  name="connectionString"
                  type="password"
                  autocomplete="new-password"
                  placeholder={ds.hasConnectionString ? "••••••••" : "postgresql://…"}
                />
              </label>
              <label class="field field--check">
                <input
                  type="checkbox"
                  name="enabled"
                  value="true"
                  checked={ds.enabled}
                />
                <span>Enabled</span>
              </label>
              <button class="btn" type="submit">Save</button>
            </form>
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <section class="admin__section" aria-labelledby="create-heading">
    <h2 id="create-heading" class="admin__h2">Add dataset</h2>
    <form method="POST" action="?/create" class="admin__form">
      <label class="field">
        <span class="field__label">Name</span>
        <input
          class="field__input"
          name="name"
          required
          pattern="[a-z][a-z0-9-]*"
          placeholder="dev"
          autocomplete="off"
        />
      </label>
      <label class="field">
        <span class="field__label">Label</span>
        <input
          class="field__input"
          name="label"
          required
          placeholder="Development"
          autocomplete="off"
        />
      </label>
      <label class="field">
        <span class="field__label">Connection string</span>
        <input
          class="field__input"
          name="connectionString"
          type="password"
          required
          autocomplete="new-password"
          placeholder="postgresql://…/kickagent_ops_dev"
        />
      </label>
      <label class="field field--check">
        <input type="checkbox" name="enabled" value="true" checked />
        <span>Enabled</span>
      </label>
      <button class="btn" type="submit">Create</button>
    </form>
  </section>
</div>

<style>
  .admin {
    max-width: 42rem;
    margin: 0 auto;
    padding: 1.5rem 1rem 3rem;
  }
  .admin__nav {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem 0.5rem;
    align-items: center;
    margin-bottom: 1.25rem;
    font-size: 0.9rem;
  }
  .admin__navLink {
    color: inherit;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .admin__navCurrent {
    font-weight: 600;
  }
  .admin__navSep {
    opacity: 0.45;
  }
  .admin__title {
    font-size: 1.5rem;
    margin: 0 0 0.5rem;
  }
  .admin__lead {
    margin: 0 0 1.25rem;
    line-height: 1.45;
    opacity: 0.9;
  }
  .admin__lead code {
    font-size: 0.9em;
  }
  .admin__err {
    color: #8b1a1a;
    margin: 0 0 1rem;
  }
  .admin__banner {
    border: 1px solid #c5d4b8;
    background: #f4f8f0;
    padding: 0.75rem 1rem;
    margin-bottom: 1rem;
  }
  .admin__banner--ok {
    border-color: #b7c9a8;
  }
  .admin__bannerTitle {
    font-weight: 600;
    margin-bottom: 0.25rem;
  }
  .admin__bannerMeta {
    margin: 0;
    font-size: 0.95rem;
  }
  .admin__toolbar {
    margin-bottom: 1.5rem;
  }
  .admin__section {
    margin-bottom: 2rem;
  }
  .admin__h2 {
    font-size: 1.1rem;
    margin: 0 0 0.75rem;
  }
  .admin__empty {
    opacity: 0.75;
    margin: 0;
  }
  .admin__form {
    display: grid;
    gap: 0.75rem;
  }
  .field {
    display: grid;
    gap: 0.25rem;
  }
  .field--check {
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 0.5rem;
  }
  .field__label {
    font-size: 0.85rem;
    font-weight: 600;
  }
  .field__hint {
    font-weight: 400;
    opacity: 0.7;
  }
  .field__input {
    font: inherit;
    padding: 0.4rem 0.5rem;
    border: 1px solid #bbb;
    border-radius: 2px;
  }
  .btn {
    font: inherit;
    padding: 0.45rem 0.9rem;
    border: 1px solid #333;
    background: #222;
    color: #fff;
    cursor: pointer;
    justify-self: start;
  }
  .btn--secondary {
    background: #fff;
    color: #222;
  }
  .dataset-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 1rem;
  }
  .dataset-card {
    border: 1px solid #ddd;
    padding: 1rem;
  }
</style>
