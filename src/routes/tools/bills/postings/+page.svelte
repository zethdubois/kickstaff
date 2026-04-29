<!--
  @docs-order
  1) /home/golem/projects/publicweb/AGENTS.md
  2) /home/golem/projects/publicweb/docs/guides/tools-bills-architecture.md
  3) /home/golem/projects/publicweb/docs/guides/tools-bills-ui-map.md
-->
<!--
  @docs: docs/sop-svelte-and-components.md
-->
<!--
  @docs-order
  1) /home/golem/projects/publicweb/AGENTS.md
  2) /home/golem/projects/publicweb/docs/guides/tools-bills-architecture.md
  3) /home/golem/projects/publicweb/docs/guides/tools-bills-ui-map.md
-->
<script lang="ts">
  let { data, form } = $props();
</script>

<svelte:head>
  <title>Postings</title>
</svelte:head>

<div class="monthly">
  <h1 class="monthly__title">Postings</h1>
  <p class="monthly__lead">
    Generate a monthly Appfolio CSV from parsed vendor bills (due date in
    selected month), then move it through queue states.
  </p>

  {#if form?.message}
    <p class="monthly__err" role="alert">{form.message}</p>
  {/if}
  {#if form?.generated}
    <p class="monthly__ok" role="status">
      Generated monthly file {form.id} ({form.recordCount} rows).
    </p>
  {/if}
  {#if form?.markedProcessing}
    <p class="monthly__ok" role="status">Marked {form.id} as processing.</p>
  {/if}
  {#if form?.markedDone}
    <p class="monthly__ok" role="status">Marked {form.id} as done.</p>
  {/if}

  <section class="monthly__card">
    <h2 class="monthly__h2">Generate batch CSV</h2>
    <form method="POST" action="?/generate" class="monthly__form">
      <label class="field">
        <span class="field__label">Category</span>
        <select class="field__input" name="category">
          {#each data.categories as c (c)}
            <option value={c} selected={c === data.defaults.category}
              >{c}</option
            >
          {/each}
        </select>
      </label>
      <label class="field">
        <span class="field__label">Vendor</span>
        <input
          class="field__input"
          name="vendor"
          type="text"
          value={data.defaults.vendor}
          required
        />
      </label>
      <label class="field">
        <span class="field__label">City</span>
        <input
          class="field__input"
          name="city"
          type="text"
          value={data.defaults.city}
          required
        />
      </label>
      <label class="field">
        <span class="field__label">Period</span>
        <input
          class="field__input"
          name="period"
          type="month"
          value={data.defaults.period}
          required
        />
      </label>
      <button class="btn" type="submit">Generate batch CSV</button>
    </form>
  </section>

  <section class="monthly__card">
    <h2 class="monthly__h2">Queue</h2>
    <ul class="rows">
      {#if data.files.length === 0}
        <li class="row"><span class="row__muted">No batch files yet.</span></li>
      {:else}
        {#each data.files as f (f.id)}
          <li class="row">
            <div>
              <div class="row__title">{f.vendor} / {f.period}</div>
              <div class="row__meta">
                {f.city ?? "—"} · {f.recordCount} rows · {f.createdAt.toLocaleString()}
              </div>
            </div>
            <div class="row__status">{f.status}</div>
            <div class="row__actions">
              <a
                class="btn btn--compact"
                href={`/tools/bills/postings/files/${f.id}/download`}
                >Download CSV</a
              >
              {#if f.status === "pending"}
                <form method="POST" action="?/markProcessing" class="row__form">
                  <input type="hidden" name="id" value={f.id} />
                  <button class="btn btn--compact" type="submit"
                    >Mark processing</button
                  >
                </form>
              {:else if f.status === "processing"}
                <form method="POST" action="?/markDone" class="row__form">
                  <input type="hidden" name="id" value={f.id} />
                  <button class="btn btn--compact" type="submit"
                    >Mark done</button
                  >
                </form>
              {/if}
            </div>
          </li>
        {/each}
      {/if}
    </ul>
  </section>
</div>

<style>
  .monthly {
    max-width: 56rem;
    margin: 0 auto;
    padding: 1.5rem 1.25rem 3rem;
  }
  .monthly__title {
    margin: 0 0 0.35rem;
    font-size: 1.5rem;
    font-weight: 700;
  }
  .monthly__lead {
    margin: 0 0 1.25rem;
    color: color-mix(in srgb, currentColor 72%, transparent);
    font-size: 0.95rem;
  }
  .monthly__err {
    margin: 0 0 1rem;
    padding: 0.5rem 0.65rem;
    border-radius: 10px;
    background: color-mix(in srgb, #c0392b 12%, transparent);
    font-size: 0.9rem;
    white-space: pre-wrap;
  }
  .monthly__ok {
    margin: 0 0 1rem;
    padding: 0.5rem 0.65rem;
    border-radius: 10px;
    background: color-mix(in srgb, #1e8449 14%, transparent);
    font-size: 0.9rem;
  }
  .monthly__card {
    margin-bottom: 1.25rem;
  }
  .monthly__h2 {
    margin: 0 0 0.65rem;
    font-size: 1.05rem;
  }
  .monthly__form {
    display: grid;
    gap: 0.75rem;
    max-width: 26rem;
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
    display: inline-block;
    text-decoration: none;
    font: inherit;
    padding: 0.45rem 0.85rem;
    border-radius: 10px;
    border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
    background: color-mix(in srgb, currentColor 10%, transparent);
    color: inherit;
    cursor: pointer;
    font-weight: 650;
  }
  .btn--compact {
    padding: 0.3rem 0.55rem;
    font-size: 0.82rem;
    font-weight: 600;
  }
  .rows {
    list-style: none;
    margin: 0;
    padding: 0;
    border: 1px solid color-mix(in srgb, currentColor 14%, transparent);
    border-radius: 12px;
    overflow: hidden;
  }
  .row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    gap: 0.65rem 0.75rem;
    align-items: center;
    padding: 0.55rem 0.75rem;
    border-bottom: 1px solid color-mix(in srgb, currentColor 10%, transparent);
    font-size: 0.92rem;
  }
  .row:last-child {
    border-bottom: none;
  }
  .row__title {
    font-weight: 600;
    overflow-wrap: anywhere;
  }
  .row__meta {
    font-size: 0.8rem;
    color: color-mix(in srgb, currentColor 60%, transparent);
  }
  .row__status {
    font-size: 0.82rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: color-mix(in srgb, currentColor 65%, transparent);
  }
  .row__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    justify-content: flex-end;
  }
  .row__form {
    margin: 0;
  }
  .row__muted {
    color: color-mix(in srgb, currentColor 60%, transparent);
  }
</style>
