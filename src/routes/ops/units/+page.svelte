<!--
  @docs: docs/guides/ops-units-ui-map.md
-->
<script lang="ts">
  import { browser } from "$app/environment";
  import { invalidateAll } from "$app/navigation";
  import { onMount } from "svelte";
  import KickagentListFilters from "$lib/kickagent/KickagentListFilters.svelte";
  import KickagentUnitsSplitView from "$lib/kickagent/KickagentUnitsSplitView.svelte";
  import {
    getUnitsDetailSchema,
    getUnitsListSchema,
    setManifestResourceCache,
  } from "$lib/kickagent/manifestResourceCache";
  import { reloadKickagentPluginFromManifest } from "$lib/kickagent/loadPluginFromManifest";
  import {
    outcomeToTableModel,
    tableOutcomeMissingHint,
    type ResourceTableModel,
  } from "$lib/kickagent/outcomeToTableModel";
  import { runManifestCommand } from "$lib/kickagent/runManifestCommand";
  import { UNITS_LIST_COMMAND } from "$lib/kickagent/unitsOps";

  let { data } = $props();

  /** Prefer server-loaded schema (no race with layout reload); fall back to client cache. */
  const schema = $derived(
    data.manifest.unitsList ?? getUnitsListSchema(),
  );

  const detailSchema = $derived(
    data.manifest.unitsDetail ?? getUnitsDetailSchema(),
  );

  let loading = $state(false);
  let reloadingManifest = $state(false);
  let error = $state<string | null>(null);
  let table = $state<ResourceTableModel | null>(null);

  function syncServerSchemaToClientCache(): void {
    if (!browser || !data.manifest.resources) return;
    if (getUnitsListSchema()) return;
    setManifestResourceCache(data.manifest.resources);
  }

  let autoLoaded = $state(false);

  onMount(() => {
    syncServerSchemaToClientCache();
    if (data.manifest.error) error = data.manifest.error;
  });

  async function runList(args: string[]) {
    const listSchema = schema;
    if (!listSchema) {
      error =
        data.manifest.error ??
        "Units list schema not loaded. Deploy kickagent ≥ 0.0.3 and reload manifest.";
      return;
    }
    loading = true;
    error = null;
    try {
      const outcome = await runManifestCommand(UNITS_LIST_COMMAND, args);
      const model = outcomeToTableModel(outcome, listSchema);
      if (model) {
        table = model;
      } else {
        table = null;
        error =
          tableOutcomeMissingHint(outcome, listSchema) ??
          "No table data in response.";
      }
    } catch (e) {
      table = null;
      error = e instanceof Error ? e.message : String(e);
    } finally {
      loading = false;
    }
  }

  async function reloadManifest() {
    reloadingManifest = true;
    error = null;
    try {
      const r = await reloadKickagentPluginFromManifest({ force: true });
      if (!r.ok) {
        error = r.error;
        return;
      }
      if (!r.resourcesCached) {
        error = `kickagent ${r.version} loaded but manifest has no resources.units.list — deploy kickagent ≥ 0.0.3`;
        return;
      }
      await invalidateAll();
      autoLoaded = false;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      reloadingManifest = false;
    }
  }

  $effect(() => {
    if (!schema || autoLoaded) return;
    autoLoaded = true;
    void runList([]);
  });
</script>

<svelte:head>
  <title>Units</title>
</svelte:head>

<div class="ops">
  <nav class="ops__nav" aria-label="Ops">
    <a class="ops__navLink" href="/">Dashboard</a>
    <span class="ops__navSep" aria-hidden="true">·</span>
    <span class="ops__navCurrent">Units</span>
  </nav>

  <header class="ops__header">
    <h1 class="ops__title">Units</h1>
    <p class="ops__lead">
      Operations units from kickagent. Select a unit in the list to load its detail form.
      ↑↓ navigate · Space menu.
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
          Manifest <code>resources.units.list</code> is not available.
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
    <KickagentListFilters {schema} {loading} onRun={runList} />

    {#if error}
      <p class="ops__err" role="alert">{error}</p>
    {/if}

    {#if table}
      <KickagentUnitsSplitView
        model={table}
        detailSchema={detailSchema}
        title="Units"
      />
    {:else if !loading && !error}
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

  .ops__lead code {
    font-size: 0.9em;
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

  .ops__empty {
    margin: 1rem 0 0;
    color: color-mix(in srgb, currentColor 60%, transparent);
  }
</style>
