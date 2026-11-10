<!--
  @docs: docs/guides/ops-accounts-ui-map.md
-->
<script lang="ts">
  import { browser } from "$app/environment";
  import { invalidateAll } from "$app/navigation";
  import { onMount, untrack } from "svelte";
  import {
    patchOpsListRow,
    peekOpsList,
    putOpsList,
    readOpsList,
  } from "$lib/client/opsListCache.svelte";
  import {
    clearListPrefs,
    getListPrefs,
    saveListPrefs,
  } from "$lib/client/uiSettings.svelte";
  import { devConsole } from "$lib/devConsole/state.svelte";
  import OpsResourceNav from "$lib/kickagent/OpsResourceNav.svelte";
  import KickagentListDetailSplitView from "$lib/kickagent/KickagentListDetailSplitView.svelte";
  import KickagentListFilters from "$lib/kickagent/KickagentListFilters.svelte";
  import {
    buildListFilterArgs,
    outcomeLogText,
    type ListFilterValues,
  } from "$lib/kickagent/listDetailForm";
  import {
    isEmptyListPrefs,
    normalizeListPrefs,
    type ListSort,
  } from "$lib/kickagent/listPrefs";
  import { visibleColumns } from "$lib/kickagent/listTable";
  import {
    getListDetailResource,
    type ManifestListFilter,
    setManifestResourceCache,
  } from "$lib/kickagent/manifestResourceCache";
  import { reloadKickagentPluginFromManifest } from "$lib/kickagent/loadPluginFromManifest";
  import {
    outcomeToTableModel,
    tableOutcomeMissingHint,
    type ResourceTableModel,
  } from "$lib/kickagent/outcomeToTableModel";
  import { runManifestCommand } from "$lib/kickagent/runManifestCommand";
  import { usePageLocation } from "$lib/client/pageLocation.svelte";

  let { data } = $props();

  const resourceName = $derived(data.resourceName);
  const pageTitle = $derived(
    data.opsLinks.find((link) => link.name === resourceName)?.label || resourceName,
  );
  usePageLocation(() => pageTitle);
  const resource = $derived(
    data.manifest.resources?.listDetail[resourceName] ??
      getListDetailResource(resourceName),
  );
  const schema = $derived(resource?.list ?? null);

  let loading = $state(false);
  let reloadingManifest = $state(false);
  let error = $state<string | null>(null);
  let notice = $state<string | null>(null);
  /** Last server-args key we already tried, so a miss does not refetch in a loop. */
  let fetchedKey = $state<string | null>(null);

  // Saved in the browser (uiSettings.listPrefs[resource]); empty = defaults.
  const prefsKey = $derived(resourceName);
  let filterValues = $state<ListFilterValues>({});
  let columnFilters = $state<Record<string, string>>({});
  let sort = $state<ListSort | null>(null);
  let visibleCount = $state(0);
  let prefsReady = $state(false);
  /** Resource name whose prefs are currently in the controls. */
  let prefsBoundTo = $state<string | null>(null);

  const hasPrefs = $derived(
    !isEmptyListPrefs(normalizeListPrefs({ filterValues, columnFilters, sort })),
  );

  const datasetName = $derived(devConsole.dbStatus?.target ?? null);
  const serverArgs = $derived(
    schema ? buildListFilterArgs(presenceFilters(schema.filters), filterValues) : [],
  );
  const table = $derived(
    schema && datasetName ? peekOpsList(resourceName, datasetName) : null,
  );

  const displayModel = $derived<ResourceTableModel | null>(
    table && schema
      ? {
          ...table,
          columns: visibleColumns(table.columns, schema.filters, filterValues),
        }
      : null,
  );

  /** Text/range filters are replaced by column quick filters; only checkboxes reach the command. */
  function presenceFilters(filters: ManifestListFilter[]): ManifestListFilter[] {
    return filters.filter((f) => f.match === "presence");
  }

  function syncServerSchemaToClientCache(): void {
    if (!browser || !data.manifest.resources) return;
    if (getListDetailResource(resourceName)) return;
    setManifestResourceCache(data.manifest.resources);
  }

  onMount(() => {
    syncServerSchemaToClientCache();
  });

  // Switching /ops/gl → /ops/sites reuses this page; rebind prefs and reload.
  $effect(() => {
    const name = resourceName;
    if (!browser || prefsBoundTo === name) return;
    const saved = getListPrefs(name);
    filterValues = { ...saved.filterValues };
    columnFilters = { ...saved.columnFilters };
    sort = saved.sort;
    notice = null;
    error = data.manifest.error && !getListDetailResource(name) ? data.manifest.error : null;
    fetchedKey = null;
    prefsBoundTo = name;
    prefsReady = true;
  });

  $effect(() => {
    if (!prefsReady || prefsBoundTo !== prefsKey) return;
    saveListPrefs(prefsKey, {
      filterValues: $state.snapshot(filterValues),
      columnFilters: $state.snapshot(columnFilters),
      sort: $state.snapshot(sort),
    });
  });

  /** Clear: filters, quick filters, sort, and the saved prefs; reload if the query changed. */
  async function clearAll() {
    const queryChanged =
      !!schema && buildListFilterArgs(presenceFilters(schema.filters), filterValues).length > 0;
    filterValues = {};
    columnFilters = {};
    sort = null;
    clearListPrefs(prefsKey);
    if (queryChanged) await runList([]);
  }

  async function runList(args: string[]) {
    const listSchema = schema;
    if (!listSchema) {
      error =
        data.manifest.error ??
        `${pageTitle} list schema not loaded. Reload the kickagent manifest.`;
      return;
    }
    const dataset = datasetName;
    if (!dataset) return;
    loading = true;
    error = null;
    notice = null;
    const name = resourceName;
    try {
      const outcome = await runManifestCommand(listSchema.command, args);
      const model = outcomeToTableModel(outcome, listSchema);
      if (model) {
        putOpsList(name, dataset, args, model);
        return;
      }
      if (!outcome.data && !outcome.presentationRef) {
        notice = outcomeLogText(outcome) ?? "No rows found.";
        return;
      }
      error =
        tableOutcomeMissingHint(outcome, listSchema) ??
        outcomeLogText(outcome) ??
        "No table data in response.";
    } catch (caught) {
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
      if (!getListDetailResource(resourceName)) {
        error = `kickagent ${result.version} loaded but manifest has no list-detail resources.${resourceName}`;
        return;
      }
      await invalidateAll();
      fetchedKey = null;
    } catch (caught) {
      error = caught instanceof Error ? caught.message : String(caught);
    } finally {
      reloadingManifest = false;
    }
  }

  function onRecordUpdated(record: Record<string, unknown>) {
    if (!datasetName) return;
    patchOpsListRow(resourceName, datasetName, record);
  }

  $effect(() => {
    const name = resourceName;
    const dataset = datasetName;
    if (!schema || !dataset || !prefsReady || prefsBoundTo !== name) return;
    const args = untrack(() => serverArgs);
    if (readOpsList(name, dataset, args)) return;
    const key = `${name}\0${dataset}\0${args.join("\u0000")}`;
    if (fetchedKey === key) return;
    fetchedKey = key;
    void runList(args);
  });
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<div class="ops">
  <div class="ops__chrome">
    <OpsResourceNav links={data.opsLinks} current={resourceName} />
  </div>

  {#if !resource || !schema}
    <div class="ops__errBlock" role="alert">
      <p class="ops__err">
        {#if data.manifest.error}
          {data.manifest.error}
        {:else}
          Manifest <code>resources.{resourceName}</code> list-detail is not available.
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
        commandLabel={schema.label}
        {loading}
        onRun={runList}
        bind:values={filterValues}
        presenceOnly
        autoRunPresence
        canClear={hasPrefs}
        onClear={clearAll}
        info={`resources.${resourceName} list-detail. Filters, columns, and save flags come from the manifest.`}
      />

      {#if error}
        <p class="ops__err" role="alert">{error}</p>
      {/if}

      {#if notice}
        <p class="ops__empty">{notice}</p>
      {/if}

      {#if table}
        <p class="ops__count">
          {visibleCount === table.rows.length
            ? `${table.rows.length} shown`
            : `${visibleCount} of ${table.rows.length} shown`}
        </p>
      {/if}
    </div>

    {#if displayModel}
      <KickagentListDetailSplitView
        model={displayModel}
        {resource}
        resourceName={resourceName}
        dataset={datasetName}
        title={pageTitle}
        {onRecordUpdated}
        bind:sort
        bind:columnFilters
        bind:visibleCount
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
    max-width: var(--ks-shell-max, 72rem);
    width: 100%;
    margin: 0 auto;
    padding: 1.25rem var(--ks-shell-pad-x, 1.25rem) 1rem;
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
