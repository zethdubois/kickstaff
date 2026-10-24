<!--
  @docs: docs/guides/ops-accounts-ui-map.md
-->
<script lang="ts">
  import { browser } from "$app/environment";
  import { invalidateAll } from "$app/navigation";
  import { onMount } from "svelte";
  import KickagentListDetailSplitView from "$lib/kickagent/KickagentListDetailSplitView.svelte";
  import KickagentListFilters from "$lib/kickagent/KickagentListFilters.svelte";
  import { outcomeLogText } from "$lib/kickagent/listDetailForm";
  import {
    getListDetailResource,
    setManifestResourceCache,
  } from "$lib/kickagent/manifestResourceCache";
  import { reloadKickagentPluginFromManifest } from "$lib/kickagent/loadPluginFromManifest";
  import {
    outcomeToTableModel,
    tableOutcomeMissingHint,
    type ResourceTableModel,
  } from "$lib/kickagent/outcomeToTableModel";
  import { runManifestCommand } from "$lib/kickagent/runManifestCommand";

  let { data } = $props();

  const resource = $derived(
    data.manifest.glResource ?? getListDetailResource("gl"),
  );
  const schema = $derived(resource?.list ?? null);

  let loading = $state(false);
  let reloadingManifest = $state(false);
  let error = $state<string | null>(null);
  let notice = $state<string | null>(null);
  let table = $state<ResourceTableModel | null>(null);
  let autoLoaded = $state(false);

  function syncServerSchemaToClientCache(): void {
    if (!browser || !data.manifest.resources) return;
    if (getListDetailResource("gl")) return;
    setManifestResourceCache(data.manifest.resources);
  }

  onMount(() => {
    syncServerSchemaToClientCache();
    if (data.manifest.error && !schema) error = data.manifest.error;
  });

  async function runList(args: string[]) {
    const listSchema = schema;
    if (!listSchema) {
      error =
        data.manifest.error ??
        "Accounts list schema not loaded. Reload the kickagent manifest.";
      return;
    }
    loading = true;
    error = null;
    notice = null;
    try {
      const outcome = await runManifestCommand(listSchema.command, args);
      const model = outcomeToTableModel(outcome, listSchema);
      if (model) {
        table = model;
        return;
      }
      table = null;
      if (!outcome.data && !outcome.presentationRef) {
        notice = outcomeLogText(outcome) ?? "No accounts found.";
        return;
      }
      error =
        tableOutcomeMissingHint(outcome, listSchema) ??
        outcomeLogText(outcome) ??
        "No table data in response.";
    } catch (caught) {
      table = null;
      error = caught instanceof Error ? caught.message : String(caught);
    } finally {
      loading = false;
    }
  }

  async function reloadManifest() {
    reloadingManifest = true;
    error = null;
    try {
      const result = await reloadKickagentPluginFromManifest({ force: true });
      if (!result.ok) {
        error = result.error;
        return;
      }
      if (!getListDetailResource("gl")) {
        error = `kickagent ${result.version} loaded but manifest has no list-detail resources.gl`;
        return;
      }
      await invalidateAll();
      autoLoaded = false;
    } catch (caught) {
      error = caught instanceof Error ? caught.message : String(caught);
    } finally {
      reloadingManifest = false;
    }
  }

  function onRecordUpdated(record: Record<string, unknown>) {
    if (!table) return;
    const key = table.primaryKey;
    const id = record[key];
    table = {
      ...table,
      rows: table.rows.map((row) =>
        row[key] === id ? { ...row, ...record } : row,
      ),
    };
  }

  $effect(() => {
    if (!schema || autoLoaded) return;
    autoLoaded = true;
    void runList([]);
  });
</script>

<svelte:head>
  <title>Accounts</title>
</svelte:head>

<div class="ops">
  <div class="ops__chrome">
    <nav class="ops__nav" aria-label="Ops">
      <a class="ops__navLink" href="/">Dashboard</a>
      <span class="ops__navSep" aria-hidden="true">·</span>
      <a class="ops__navLink" href="/ops/units">Units</a>
      <span class="ops__navSep" aria-hidden="true">·</span>
      <span class="ops__navCurrent">Accounts</span>
    </nav>

    <header class="ops__header">
      <h1 class="ops__title">
        Accounts
        <button
          type="button"
          class="ops__info"
          title="Chart of accounts from kickagent list-detail schema. Filters, columns, and save flags come from the manifest."
          aria-label="Chart of accounts from kickagent list-detail schema. Filters, columns, and save flags come from the manifest."
        >i</button>
      </h1>
    </header>
  </div>

  {#if !resource || !schema}
    <div class="ops__errBlock" role="alert">
      <p class="ops__err">
        {#if data.manifest.error}
          {data.manifest.error}
        {:else}
          Manifest <code>resources.gl</code> list-detail is not available.
        {/if}
      </p>
      <button
        type="button"
        class="ops__btn"
        disabled={reloadingManifest}
        onclick={reloadManifest}
      >
        {reloadingManifest ? "Reloading…" : "Reload kickagent manifest"}
      </button>
    </div>
  {:else}
    <div class="ops__chrome">
      <KickagentListFilters
        filters={schema.filters}
        command={schema.command}
        {loading}
        onRun={runList}
      />

      {#if error}
        <p class="ops__err" role="alert">{error}</p>
      {/if}

      {#if notice}
        <p class="ops__empty">{notice}</p>
      {/if}

      {#if table}
        <p class="ops__count">{table.rows.length} shown</p>
      {/if}
    </div>

    {#if table}
      <KickagentListDetailSplitView
        model={table}
        {resource}
        title="Accounts"
        {onRecordUpdated}
      />
    {:else if !loading && !error && !notice}
      <p class="ops__empty">No rows returned.</p>
    {/if}
  {/if}
</div>

<style>
  .ops {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 100%;
    max-width: 72rem;
    width: 100%;
    margin: 0 auto;
    padding: 1.25rem 1rem 1rem;
    overflow: hidden;
  }

  /* List is at its floor and detail still does not fit: let main scroll. */
  :global(.ops:has(.split--pageScroll)) {
    height: auto;
    overflow: visible;
  }

  .ops__chrome {
    flex: 0 0 auto;
  }

  .ops__nav {
    margin-bottom: 0.75rem;
    font-size: 0.88rem;
    color: color-mix(in srgb, currentColor 65%, transparent);
  }

  .ops__navLink {
    color: inherit;
    font-weight: 600;
    text-decoration: underline;
    text-underline-offset: 0.12em;
  }

  .ops__navSep {
    margin: 0 0.35rem;
  }

  .ops__navCurrent {
    font-weight: 600;
  }

  .ops__header {
    margin-bottom: 0.75rem;
  }

  .ops__title {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    margin: 0;
    font-size: 1.75rem;
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  .ops__info {
    appearance: none;
    padding: 0;
    background: transparent;
    font-family: inherit;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.05rem;
    height: 1.05rem;
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, currentColor 35%, transparent);
    color: color-mix(in srgb, currentColor 55%, transparent);
    font-size: 0.72rem;
    font-weight: 700;
    font-style: italic;
    line-height: 1;
    cursor: help;
    user-select: none;
  }

  .ops__info:hover,
  .ops__info:focus-visible {
    color: inherit;
    border-color: color-mix(in srgb, currentColor 55%, transparent);
    outline: none;
  }

  .ops__errBlock {
    margin-top: 1rem;
  }

  .ops__err {
    margin: 0 0 0.65rem;
    padding: 0.65rem 0.85rem;
    border-radius: 6px;
    background: color-mix(in srgb, #c62828 12%, transparent);
    color: #b71c1c;
    font-size: 0.95rem;
  }

  .ops__btn {
    font: inherit;
    font-size: 0.9rem;
    padding: 0.4rem 0.75rem;
    border-radius: 6px;
    border: 1px solid color-mix(in srgb, currentColor 25%, transparent);
    background: color-mix(in srgb, currentColor 8%, transparent);
    cursor: pointer;
  }

  .ops__btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .ops__empty,
  .ops__count {
    margin: 0.5rem 0 0;
    color: color-mix(in srgb, currentColor 60%, transparent);
  }

  .ops__count {
    font-size: 0.85rem;
    margin-bottom: 0;
  }
</style>
