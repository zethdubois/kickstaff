<!--
  @docs: docs/sop-svelte-and-components.md
  @component: KickagentAccountsSplitView.svelte
-->
<script lang="ts">
  import KickagentAccountDetailPane from "./KickagentAccountDetailPane.svelte";
  import { formatPresentationCell } from "./formatPresentationCell";
  import {
    accountFromShowOutcome,
    accountOutcomeMessage,
    buildGlUpdateArgs,
    glDetailFields,
  } from "./glAccountForm";
  import {
    getManifestResources,
    type ManifestGlDetailResource,
    type ManifestGlUpdateResource,
  } from "./manifestResourceCache";
  import type { ResourceTableModel } from "./outcomeToTableModel";
  import { runManifestCommand } from "./runManifestCommand";

  type Props = {
    model: ResourceTableModel;
    detailSchema?: ManifestGlDetailResource | null;
    updateSchema?: ManifestGlUpdateResource | null;
    title?: string;
    variant?: "console" | "page";
    onAccountUpdated?: (account: Record<string, unknown>) => void;
  };

  let {
    model,
    detailSchema = null,
    updateSchema = null,
    title = "Accounts",
    variant = "page",
    onAccountUpdated,
  }: Props = $props();

  const resolvedDetail = $derived(
    detailSchema ?? getManifestResources()?.gl?.detail ?? null,
  );
  const resolvedUpdate = $derived(
    updateSchema ?? getManifestResources()?.gl?.update ?? null,
  );
  const fields = $derived(
    glDetailFields(model.columns, resolvedUpdate?.editableFields ?? []),
  );

  let selectedId = $state<string | null>(null);
  let detailAccount = $state<Record<string, unknown> | null>(null);
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
    const schema = resolvedDetail;
    const id = rowId(row);
    selectedId = id;
    if (!schema) {
      detailAccount = null;
      detailError = "Account detail schema not loaded.";
      return;
    }
    if (!id) {
      detailAccount = null;
      detailError = "Selected row has no id.";
      return;
    }

    const gen = ++detailLoadGen;
    detailLoading = true;
    detailError = null;
    try {
      const outcome = await runManifestCommand(schema.command, ["--id", id]);
      if (gen !== detailLoadGen) return;
      const account = accountFromShowOutcome(outcome);
      if (account) {
        detailAccount = account;
        detailError = null;
      } else {
        detailAccount = null;
        detailError = accountOutcomeMessage(outcome);
      }
    } catch (error) {
      if (gen !== detailLoadGen) return;
      detailAccount = null;
      detailError = error instanceof Error ? error.message : String(error);
    } finally {
      if (gen === detailLoadGen) detailLoading = false;
    }
  }

  async function saveDetail(
    draft: Record<string, unknown>,
  ): Promise<string | void> {
    const detail = resolvedDetail;
    const update = resolvedUpdate;
    const current = detailAccount;
    if (!detail || !update || !current) return "Account detail schema not loaded.";
    const args = buildGlUpdateArgs(current, draft, update.editableFields);
    if (args === null) return "Account has no id or number.";
    if (args.length === 0) return "No changes to save.";

    detailSaving = true;
    detailError = null;
    try {
      const outcome = await runManifestCommand(detail.submitCommand, args);
      const account = accountFromShowOutcome(outcome);
      if (!account) {
        detailError = accountOutcomeMessage(outcome);
        return;
      }
      detailAccount = account;
      onAccountUpdated?.(account);
      return "Saved.";
    } catch (error) {
      detailError = error instanceof Error ? error.message : String(error);
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
      detailAccount = null;
      detailLoading = false;
      detailError = null;
    }
  });
</script>

<div class="accounts" class:accounts--console={variant === "console"}>
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

  {#if resolvedDetail}
    <KickagentAccountDetailPane
      titleKey={resolvedDetail.titleKey}
      {fields}
      account={detailAccount}
      loading={detailLoading}
      saving={detailSaving}
      error={detailError}
      {variant}
      onSave={saveDetail}
    />
  {:else}
    <section class="detailMissing" aria-label="Account details">
      <p>Detail schema not available. Reload kickagent manifest.</p>
    </section>
  {/if}
</div>

<style>
  .accounts {
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

  .accounts--console .tableWrap {
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

  .accounts--console th {
    background: #121820;
    color: #9aa3b3;
  }

  tr {
    cursor: pointer;
  }

  tr.selected {
    background: color-mix(in srgb, #1565c0 14%, transparent);
  }

  .accounts--console tr.selected {
    background: #1a2638;
  }

  .detailMissing {
    margin: 0;
    padding: 1rem 0.75rem;
    font-size: 0.9rem;
    color: color-mix(in srgb, currentColor 60%, transparent);
  }
</style>
