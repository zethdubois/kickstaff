<!--
  @docs: docs/sop-svelte-and-components.md
  @component: KickagentUnitsSplitView.svelte
-->
<script lang="ts">
  import KickagentResourceList from "./KickagentResourceList.svelte";
  import KickagentUnitDetailPane from "./KickagentUnitDetailPane.svelte";
  import type { ManifestUnitsDetailResource } from "./manifestResourceCache";
  import { getManifestResources } from "./manifestResourceCache";
  import type { ResourceTableModel } from "./outcomeToTableModel";
  import { runManifestCommand } from "./runManifestCommand";
  import type { ResourceListItem } from "./resourceListModel";
  import { unitFromShowOutcome, unitShowErrorMessage } from "./unitDetailLoad";
  import { buildUnitsListActions } from "./unitsListActions";

  type Props = {
    model: ResourceTableModel;
    detailSchema?: ManifestUnitsDetailResource | null;
    title?: string;
    variant?: "console" | "page";
    onActionMessage?: (message: string) => void;
  };

  let {
    model,
    detailSchema = null,
    title = "Units",
    variant = "page",
    onActionMessage,
  }: Props = $props();

  const resolvedDetailSchema = $derived(
    detailSchema ?? getManifestResources()?.units.detail ?? null,
  );

  const listActions = $derived.by(() => {
    const base = buildUnitsListActions(model, { onActionMessage });
    return {
      primary: {
        id: "reload-detail",
        label: "Reload detail",
        run: (item: ResourceListItem) => loadDetailForItem(item),
      },
      secondary: base.secondary,
    };
  });

  let detailUnit = $state<Record<string, unknown> | null>(null);
  let detailLoading = $state(false);
  let detailError = $state<string | null>(null);
  let detailLoadGen = 0;

  async function loadDetailForItem(item: ResourceListItem) {
    const schema = resolvedDetailSchema;
    if (!schema) {
      detailUnit = null;
      detailError = "Unit detail schema not loaded.";
      return;
    }

    const id = item.row[model.primaryKey];
    if (id == null || id === "") {
      detailUnit = null;
      detailError = "Selected row has no id.";
      return;
    }

    const gen = ++detailLoadGen;
    detailLoading = true;
    detailError = null;

    try {
      const outcome = await runManifestCommand(schema.command, [
        "--id",
        String(id),
      ]);
      if (gen !== detailLoadGen) return;

      const unit = unitFromShowOutcome(outcome);
      if (unit) {
        detailUnit = unit;
        detailError = null;
      } else {
        detailUnit = null;
        detailError = unitShowErrorMessage(outcome);
      }
    } catch (e) {
      if (gen !== detailLoadGen) return;
      detailUnit = null;
      detailError = e instanceof Error ? e.message : String(e);
    } finally {
      if (gen === detailLoadGen) detailLoading = false;
    }
  }

  function onSelectedChange(item: ResourceListItem) {
    void loadDetailForItem(item);
  }

  function onSelectionCleared() {
    detailLoadGen += 1;
    detailLoading = false;
    detailUnit = null;
    detailError = null;
  }
</script>

<div
  class="unitsSplit"
  class:unitsSplit--console={variant === "console"}
  class:unitsSplit--page={variant === "page"}
>
  <div class="unitsSplit__list">
    <KickagentResourceList
      {model}
      actions={listActions}
      {title}
      {variant}
      layout="pane"
      {onSelectedChange}
      {onSelectionCleared}
    />
  </div>

  <div class="unitsSplit__detail">
    {#if resolvedDetailSchema}
      <KickagentUnitDetailPane
        schema={resolvedDetailSchema}
        unit={detailUnit}
        loading={detailLoading}
        error={detailError}
        {variant}
      />
    {:else}
      <section class="detailMissing" aria-label="Unit details">
        <p>Detail schema not available. Reload kickagent manifest.</p>
      </section>
    {/if}
  </div>
</div>

<style>
  .unitsSplit {
    display: grid;
    gap: 0;
    margin: 0.75rem 0 1rem;
    border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
    border-radius: 8px;
    overflow: hidden;
    background: var(--resource-table-bg, #fff);
    min-height: min(70vh, 32rem);
  }

  .unitsSplit--console {
    margin: 0.35rem 0 0.5rem;
    border-color: #2a3548;
    border-radius: 6px;
    background: #0e1219;
    min-height: 18rem;
    grid-template-columns: 1fr;
    grid-template-rows: minmax(8rem, 1fr) minmax(10rem, 1.2fr);
  }

  .unitsSplit--page {
    grid-template-columns: minmax(14rem, 32%) 1fr;
  }

  .unitsSplit__list {
    min-width: 0;
    border-right: 1px solid color-mix(in srgb, currentColor 12%, transparent);
    display: flex;
    flex-direction: column;
  }

  .unitsSplit--console .unitsSplit__list {
    border-right: 0;
    border-bottom: 1px solid #1d2129;
  }

  .unitsSplit__detail {
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .unitsSplit__detail :global(.detailPane) {
    border: 0;
    border-radius: 0;
    min-height: 100%;
    flex: 1;
  }

  .unitsSplit__list :global(.resourceList) {
    margin: 0;
    border: 0;
    border-radius: 0;
    min-height: 100%;
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .unitsSplit__list :global(.list) {
    flex: 1;
    max-height: none;
  }

  .detailMissing {
    margin: 0;
    padding: 1rem 0.75rem;
    font-size: 0.9rem;
    color: color-mix(in srgb, currentColor 60%, transparent);
  }

  @media (max-width: 52rem) {
    .unitsSplit--page {
      grid-template-columns: 1fr;
      grid-template-rows: minmax(12rem, 40%) 1fr;
    }

    .unitsSplit--page .unitsSplit__list {
      border-right: 0;
      border-bottom: 1px solid color-mix(in srgb, currentColor 12%, transparent);
    }
  }
</style>
