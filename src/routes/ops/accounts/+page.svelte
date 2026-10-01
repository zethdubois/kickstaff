<!--
  @docs: docs/guides/ops-accounts-ui-map.md
-->
<script lang="ts">
  import { browser } from "$app/environment";
  import { invalidateAll } from "$app/navigation";
  import { onMount } from "svelte";
  import KickagentAccountsListControls from "$lib/kickagent/KickagentAccountsListControls.svelte";
  import KickagentAccountsSplitView from "$lib/kickagent/KickagentAccountsSplitView.svelte";
  import { outcomeLogText } from "$lib/kickagent/glAccountForm";
  import {
    getGlDetailSchema,
    getGlListSchema,
    getGlUpdateSchema,
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

  const schema = $derived(data.manifest.glList ?? getGlListSchema());
  const detailSchema = $derived(
    data.manifest.glDetail ?? getGlDetailSchema(),
  );
  const updateSchema = $derived(
    data.manifest.glUpdate ?? getGlUpdateSchema(),
  );

  let loading = $state(false);
  let reloadingManifest = $state(false);
  let error = $state<string | null>(null);
  let notice = $state<string | null>(null);
  let table = $state<ResourceTableModel | null>(null);
  let autoLoaded = $state(false);

  function syncServerSchemaToClientCache(): void {
    if (!browser || !data.manifest.resources) return;
    if (getGlListSchema()) return;
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
      if (!getGlListSchema()) {
        error = `kickagent ${result.version} loaded but manifest has no resources.gl.list`;
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

  function onAccountUpdated(account: Record<string, unknown>) {
    if (!table) return;
    const key = table.primaryKey;
    const id = account[key];
    table = {
      ...table,
      rows: table.rows.map((row) => (row[key] === id ? { ...row, ...account } : row)),
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
  <nav class="ops__nav" aria-label="Ops">
    <a class="ops__navLink" href="/">Dashboard</a>
    <span class="ops__navSep" aria-hidden="true">·</span>
    <a class="ops__navLink" href="/ops/units">Units</a>
    <span class="ops__navSep" aria-hidden="true">·</span>
    <span class="ops__navCurrent">Accounts</span>
  </nav>

  <header class="ops__header">
    <h1 class="ops__title">Accounts</h1>
    <p class="ops__lead">
      Chart of accounts from kickagent. The table uses manifest columns. Select a
      row to load its detail, then save changes.
    </p>
    {#if data.manifest.manifestVersion}
      <p class="ops__meta">
        Manifest v{data.manifest.manifestVersion}
        {#if data.manifest.manifestUrl}
          · <code>{data.manifest.manifestUrl}</code>
        {/if}
      </p>
    {/if}
  </header>

  {#if !schema}
    <div class="ops__errBlock" role="alert">
      <p class="ops__err">
        {#if data.manifest.error}
          {data.manifest.error}
        {:else}
          Manifest <code>resources.gl.list</code> is not available.
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
    <KickagentAccountsListControls {loading} onRun={runList} />

    {#if error}
      <p class="ops__err" role="alert">{error}</p>
    {/if}

    {#if notice}
      <p class="ops__empty">{notice}</p>
    {/if}

    {#if table}
      <p class="ops__count">{table.rows.length} shown</p>
      <KickagentAccountsSplitView
        model={table}
        {detailSchema}
        {updateSchema}
        title="Accounts"
        {onAccountUpdated}
      />
    {:else if !loading && !error && !notice}
      <p class="ops__empty">No rows returned.</p>
    {/if}
  {/if}
</div>

<style>
  .ops {
    max-width: 72rem;
    margin: 0 auto;
    padding: 1.25rem 1rem 2rem;
  }

  .ops__nav {
    margin-bottom: 1rem;
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
    margin-bottom: 1rem;
  }

  .ops__title {
    margin: 0 0 0.35rem;
    font-size: 1.75rem;
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  .ops__lead {
    margin: 0;
    color: color-mix(in srgb, currentColor 70%, transparent);
    line-height: 1.45;
    max-width: 42rem;
  }

  .ops__meta {
    margin: 0.5rem 0 0;
    font-size: 0.82rem;
    color: color-mix(in srgb, currentColor 55%, transparent);
  }

  .ops__meta code {
    font-size: 0.92em;
    word-break: break-all;
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
    margin: 0.75rem 0 0;
    color: color-mix(in srgb, currentColor 60%, transparent);
  }

  .ops__count {
    font-size: 0.85rem;
  }
</style>
