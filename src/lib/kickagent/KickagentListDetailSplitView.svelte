<!--
  @docs: docs/sop-svelte-and-components.md
  @component: KickagentListDetailSplitView.svelte
-->
<script lang="ts">
  import { tick } from "svelte";
  import KickagentListDetailPane from "./KickagentListDetailPane.svelte";
  import { formatPresentationCell } from "./formatPresentationCell";
  import {
    buildListDetailUpdateArgs,
    recordFromShowOutcome,
    recordOutcomeMessage,
  } from "./listDetailForm";
  import type { ManifestListDetailResource } from "./manifestResourceCache";
  import type { ResourceTableModel } from "./outcomeToTableModel";
  import { runManifestCommand } from "./runManifestCommand";

  type Props = {
    model: ResourceTableModel;
    resource: ManifestListDetailResource;
    title?: string;
    variant?: "console" | "page";
    onRecordUpdated?: (record: Record<string, unknown>) => void;
  };

  let {
    model,
    resource,
    title = "Results",
    variant = "page",
    onRecordUpdated,
  }: Props = $props();

  let selectedId = $state<string | null>(null);
  let detailRecord = $state<Record<string, unknown> | null>(null);
  let detailLoading = $state(false);
  let detailSaving = $state(false);
  let detailError = $state<string | null>(null);
  let detailLoadGen = 0;
  let scrollEl: HTMLDivElement | undefined = $state();

  const detailOpen = $derived(
    selectedId != null || detailLoading || detailError != null,
  );

  function rowId(row: Record<string, unknown>): string | null {
    const id = row[model.primaryKey];
    if (id == null || id === "") return null;
    return String(id);
  }

  function clearSelection() {
    detailLoadGen += 1;
    selectedId = null;
    detailRecord = null;
    detailLoading = false;
    detailError = null;
  }

  function centerSelectedRow(id: string) {
    const scroller = scrollEl;
    if (!scroller) return;
    const row = scroller.querySelector(
      `tr[data-row-id="${CSS.escape(id)}"]`,
    ) as HTMLTableRowElement | null;
    if (!row) return;

    const scRect = scroller.getBoundingClientRect();
    const rowRect = row.getBoundingClientRect();
    const target =
      scroller.scrollTop +
      (rowRect.top - scRect.top) -
      scRect.height / 2 +
      rowRect.height / 2;
    const max = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    scroller.scrollTo({
      top: Math.min(max, Math.max(0, target)),
      behavior: "smooth",
    });
  }

  async function recenterAfterLayout(id: string) {
    await tick();
    requestAnimationFrame(() => {
      centerSelectedRow(id);
      // Detail mount changes list height; center again after that reflow.
      requestAnimationFrame(() => centerSelectedRow(id));
    });
  }

  async function selectRow(row: Record<string, unknown>) {
    const id = rowId(row);
    if (id != null && id === selectedId) {
      clearSelection();
      return;
    }

    selectedId = id;
    if (!id) {
      detailRecord = null;
      detailError = "Selected row has no id.";
      return;
    }

    void recenterAfterLayout(id);

    const gen = ++detailLoadGen;
    detailLoading = true;
    detailError = null;
    try {
      const outcome = await runManifestCommand(resource.detail.command, [
        "--id",
        id,
      ]);
      if (gen !== detailLoadGen) return;
      const record = recordFromShowOutcome(outcome, resource.detail.recordKey);
      if (record) {
        detailRecord = record;
        detailError = null;
      } else {
        detailRecord = null;
        detailError = recordOutcomeMessage(outcome, resource.detail.recordKey);
      }
    } catch (caught) {
      if (gen !== detailLoadGen) return;
      detailRecord = null;
      detailError = caught instanceof Error ? caught.message : String(caught);
    } finally {
      if (gen === detailLoadGen) detailLoading = false;
    }

    if (gen === detailLoadGen) void recenterAfterLayout(id);
  }

  async function saveDetail(
    draft: Record<string, unknown>,
  ): Promise<string | void> {
    const current = detailRecord;
    if (!current) return "No record loaded.";
    const args = buildListDetailUpdateArgs(current, draft, resource.detail);
    if (args === null) return "Record has no identity flag.";
    if (args.length === 0) return "No changes to save.";

    detailSaving = true;
    detailError = null;
    try {
      const outcome = await runManifestCommand(
        resource.detail.submitCommand,
        args,
      );
      const record = recordFromShowOutcome(outcome, resource.detail.recordKey);
      if (!record) {
        detailError = recordOutcomeMessage(outcome, resource.detail.recordKey);
        return;
      }
      detailRecord = record;
      onRecordUpdated?.(record);
      return "Saved.";
    } catch (caught) {
      detailError = caught instanceof Error ? caught.message : String(caught);
    } finally {
      detailSaving = false;
    }
  }

  $effect(() => {
    if (!selectedId) return;
    const stillThere = model.rows.some((row) => rowId(row) === selectedId);
    if (!stillThere) clearSelection();
  });
</script>

<div
  class="split"
  class:split--console={variant === "console"}
  class:split--hasDetail={detailOpen && variant === "page"}
>
  <section class="tableWrap" aria-label={title}>
    <div class="scroll" bind:this={scrollEl}>
      <table>
        <thead>
          <tr>
            {#each model.columns as column (column.key)}
              <th>{column.label}</th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each model.rows as row, index (`${rowId(row) ?? index}`)}
            {@const id = rowId(row)}
            <tr
              data-row-id={id ?? undefined}
              class:selected={id != null && id === selectedId}
              aria-selected={id != null && id === selectedId}
              tabindex="0"
              onclick={() => selectRow(row)}
              onkeydown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  void selectRow(row);
                }
              }}
            >
              {#each model.columns as column (column.key)}
                <td>{formatPresentationCell(row[column.key], column.type)}</td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>

  {#if detailOpen}
    <div class="detailSlot">
      <KickagentListDetailPane
        titleKey={resource.detail.titleKey}
        fields={resource.detail.fields}
        record={detailRecord}
        loading={detailLoading}
        saving={detailSaving}
        error={detailError}
        {variant}
        onSave={saveDetail}
      />
    </div>
  {/if}
</div>

<style>
  .split {
    --list-head-height: 2rem;
    --list-row-height: 2.25rem;
    --list-min-height: calc(
      var(--list-head-height) + 5 * var(--list-row-height)
    );

    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    flex: 1 1 auto;
    min-height: 0;
    margin: 0.5rem 0 0;
  }

  .split--console {
    flex: 0 0 auto;
    min-height: unset;
    margin: 0.75rem 0 1rem;
  }

  .tableWrap {
    flex: 1 1 auto;
    min-height: var(--list-min-height);
    border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
    border-radius: 8px;
    overflow: hidden;
    background: var(--resource-table-bg, #fff);
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .split--console .tableWrap {
    flex: 0 0 auto;
    min-height: unset;
    border-color: #2a3548;
    background: #0e1219;
  }

  .scroll {
    flex: 1 1 auto;
    min-height: 0;
    overflow: auto;
  }

  .split--console .scroll {
    max-height: min(50vh, 28rem);
  }

  .detailSlot {
    flex: 0 1 auto;
    min-height: 0;
    max-height: calc(100% - var(--list-min-height) - 0.75rem);
    overflow: auto;
    display: flex;
    flex-direction: column;
  }

  .split--console .detailSlot {
    max-height: none;
  }

  .detailSlot :global(.detailPane) {
    min-height: 0;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
  }

  th,
  td {
    padding: 0.45rem 0.6rem;
    text-align: left;
    border-bottom: 1px solid color-mix(in srgb, currentColor 10%, transparent);
    white-space: nowrap;
  }

  th {
    position: sticky;
    top: 0;
    font-size: 0.72rem;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    background: color-mix(in srgb, currentColor 6%, #fff);
  }

  tr {
    cursor: pointer;
  }

  tr.selected {
    background: color-mix(in srgb, #1565c0 14%, transparent);
  }
</style>
