<!--
  @docs: docs/sop-svelte-and-components.md
  @component: KickagentListDetailSplitView.svelte
-->
<script lang="ts">
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

  function rowId(row: Record<string, unknown>): string | null {
    const id = row[model.primaryKey];
    if (id == null || id === "") return null;
    return String(id);
  }

  async function loadDetail(row: Record<string, unknown>) {
    const id = rowId(row);
    selectedId = id;
    if (!id) {
      detailRecord = null;
      detailError = "Selected row has no id.";
      return;
    }

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
    if (!stillThere) {
      detailLoadGen += 1;
      selectedId = null;
      detailRecord = null;
      detailLoading = false;
      detailError = null;
    }
  });
</script>

<div class="split" class:split--console={variant === "console"}>
  <section class="tableWrap" aria-label={title}>
    <div class="scroll">
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
              class:selected={id != null && id === selectedId}
              aria-selected={id != null && id === selectedId}
              tabindex="0"
              onclick={() => loadDetail(row)}
              onkeydown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  void loadDetail(row);
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

<style>
  .split {
    display: grid;
    gap: 0.75rem;
    margin: 0.75rem 0 1rem;
  }

  .tableWrap {
    border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
    border-radius: 8px;
    overflow: hidden;
    background: var(--resource-table-bg, #fff);
  }

  .split--console .tableWrap {
    border-color: #2a3548;
    background: #0e1219;
  }

  .scroll {
    overflow: auto;
    max-height: min(50vh, 28rem);
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
