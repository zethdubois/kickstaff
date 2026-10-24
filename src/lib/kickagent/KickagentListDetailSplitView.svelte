<!--
  @docs: docs/sop-svelte-and-components.md
  @component: KickagentListDetailSplitView.svelte
-->
<script lang="ts">
  import { tick, untrack } from "svelte";
  import KickagentBoolMark from "./KickagentBoolMark.svelte";
  import KickagentListDetailPane from "./KickagentListDetailPane.svelte";
  import { formatPresentationCell } from "./formatPresentationCell";
  import {
    buildListDetailUpdateArgs,
    recordFromShowOutcome,
    recordOutcomeMessage,
  } from "./listDetailForm";
  import type { ListSort } from "./listPrefs";
  import {
    effectiveSort,
    filterRows,
    isFilterableColumn,
    nextSort,
    sortRows,
  } from "./listTable";
  import type { ManifestListDetailResource } from "./manifestResourceCache";
  import type { ResourceTableModel } from "./outcomeToTableModel";
  import { runManifestCommand } from "./runManifestCommand";

  type Props = {
    model: ResourceTableModel;
    resource: ManifestListDetailResource;
    title?: string;
    variant?: "console" | "page";
    onRecordUpdated?: (record: Record<string, unknown>) => void;
    /** Sort override; `null` = default (first column ascending). */
    sort?: ListSort | null;
    /** Quick substring filter per column key. */
    columnFilters?: Record<string, string>;
    /** Rows left after quick filters (for "x of y shown"). */
    visibleCount?: number;
  };

  let {
    model,
    resource,
    title = "Results",
    variant = "page",
    onRecordUpdated,
    sort = $bindable(null),
    columnFilters = $bindable({}),
    visibleCount = $bindable(0),
  }: Props = $props();

  const activeSort = $derived(effectiveSort(model.columns, sort));
  const displayRows = $derived(
    sortRows(
      filterRows(model.rows, model.columns, columnFilters),
      model.columns,
      activeSort,
    ),
  );

  $effect(() => {
    visibleCount = displayRows.length;
  });

  function toggleSort(key: string) {
    sort = nextSort(model.columns, sort, key);
  }

  function setColumnFilter(key: string, value: string) {
    const next = { ...columnFilters };
    if (value.trim() === "") delete next[key];
    else next[key] = value;
    columnFilters = next;
  }

  const ARROW_LOAD_DELAY_MS = 150;
  let loadTimer: ReturnType<typeof setTimeout> | undefined;

  let selectedId = $state<string | null>(null);
  let detailRecord = $state<Record<string, unknown> | null>(null);
  let detailLoading = $state(false);
  let detailSaving = $state(false);
  let detailError = $state<string | null>(null);
  let detailLoadGen = 0;
  let scrollEl: HTMLDivElement | undefined = $state();
  let splitEl: HTMLDivElement | undefined = $state();
  /** List is at its 5-row floor and detail still does not fit: main scrolls. */
  let pageScroll = $state(false);

  const detailOpen = $derived(
    selectedId != null || detailLoading || detailError != null,
  );

  function measureFit() {
    if (variant === "console") return;
    const split = splitEl;
    if (!split) return;
    const ops = split.closest(".ops");
    const main = split.closest("main");
    if (!(ops instanceof HTMLElement) || !(main instanceof HTMLElement)) return;

    if (!detailOpen) {
      pageScroll = false;
      return;
    }

    const detail = split.querySelector(".detailSlot");
    if (!(detail instanceof HTMLElement)) return;

    if (!pageScroll) {
      // List scrollHeight must not count. Only the detail box extending
      // past the ops box means the list is already at its floor.
      const detailBottom = detail.getBoundingClientRect().bottom;
      const opsBottom = ops.getBoundingClientRect().bottom;
      if (detailBottom > opsBottom + 2) pageScroll = true;
      return;
    }

    if (ops.getBoundingClientRect().height <= main.clientHeight + 2) {
      pageScroll = false;
    }
  }

  function rowId(row: Record<string, unknown>): string | null {
    const id = row[model.primaryKey];
    if (id == null || id === "") return null;
    return String(id);
  }

  function clearSelection() {
    clearTimeout(loadTimer);
    detailLoadGen += 1;
    selectedId = null;
    detailRecord = null;
    detailLoading = false;
    detailError = null;
  }

  function centerSelectedRow(id: string, behavior: ScrollBehavior = "smooth") {
    const scroller = scrollEl;
    if (!scroller) return;
    const row = scroller.querySelector(
      `tr[data-row-id="${CSS.escape(id)}"]`,
    ) as HTMLTableRowElement | null;
    if (!row) return;

    // The sticky header covers the top of the scroll box; center in what remains.
    const headH =
      scroller.querySelector("thead")?.getBoundingClientRect().height ?? 0;
    const scRect = scroller.getBoundingClientRect();
    const rowRect = row.getBoundingClientRect();
    const target =
      scroller.scrollTop +
      (rowRect.top - scRect.top) -
      headH -
      (scRect.height - headH) / 2 +
      rowRect.height / 2;
    const max = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    scroller.scrollTo({
      top: Math.min(max, Math.max(0, target)),
      behavior,
    });
  }

  async function recenterAfterLayout(
    id: string,
    behavior: ScrollBehavior = "smooth",
  ) {
    await tick();
    requestAnimationFrame(() => {
      centerSelectedRow(id, behavior);
      // Detail mount changes list height; center again after that reflow.
      requestAnimationFrame(() => centerSelectedRow(id, behavior));
    });
  }

  /** Up/Down: move to the neighbouring row in the displayed (sorted, filtered) order. */
  function moveSelection(delta: 1 | -1) {
    const rows = displayRows;
    if (rows.length === 0) return;
    const index =
      selectedId == null
        ? -1
        : rows.findIndex((candidate) => rowId(candidate) === selectedId);
    const nextIndex =
      index < 0
        ? delta > 0
          ? 0
          : rows.length - 1
        : Math.min(rows.length - 1, Math.max(0, index + delta));
    if (nextIndex === index) return;
    void selectRow(rows[nextIndex], { keyboard: true });
  }

  async function selectRow(
    row: Record<string, unknown>,
    options: { keyboard?: boolean } = {},
  ) {
    const id = rowId(row);
    if (!options.keyboard && id != null && id === selectedId) {
      clearSelection();
      return;
    }

    clearTimeout(loadTimer);
    selectedId = id;
    if (!id) {
      detailRecord = null;
      detailError = "Selected row has no id.";
      return;
    }

    void recenterAfterLayout(id, options.keyboard ? "auto" : "smooth");

    if (options.keyboard) {
      // Holding the arrow key must not fire one detail request per row.
      detailLoadGen += 1;
      detailLoading = true;
      detailError = null;
      loadTimer = setTimeout(() => {
        if (selectedId === id) void loadDetail(id);
      }, ARROW_LOAD_DELAY_MS);
      await tick();
      scrollEl
        ?.querySelector<HTMLElement>(`tr[data-row-id="${CSS.escape(id)}"]`)
        ?.focus({ preventScroll: true });
      return;
    }

    await loadDetail(id);
  }

  async function loadDetail(id: string) {
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

  $effect(() => {
    detailOpen;
    detailRecord;
    detailLoading;
    detailError;
    pageScroll;
    const split = splitEl;
    if (!split || variant === "console") return;

    measureFit();
    const ops = split.closest(".ops");
    const main = split.closest("main");
    const ro = new ResizeObserver(() => measureFit());
    ro.observe(split);
    if (ops) ro.observe(ops);
    if (main) ro.observe(main);
    const slot = split.querySelector(".detailSlot");
    if (slot) ro.observe(slot);
    return () => ro.disconnect();
  });

  $effect(() => {
    if (!selectedId || variant === "console") return;
    pageScroll;
    void recenterAfterLayout(selectedId);
  });

  // Sorting or filtering moves the selected row: keep it centered.
  $effect(() => {
    activeSort;
    displayRows;
    const id = untrack(() => selectedId);
    if (id && variant !== "console") void recenterAfterLayout(id, "auto");
  });
</script>

<div
  class="split"
  class:split--console={variant === "console"}
  class:split--pageScroll={pageScroll}
  bind:this={splitEl}
>
  <section class="tableWrap" aria-label={title}>
    <div class="scroll" bind:this={scrollEl}>
      <table>
        <thead>
          <tr>
            {#each model.columns as column (column.key)}
              {@const dir =
                activeSort?.key === column.key ? activeSort.dir : null}
              <th
                class:thBool={column.type === "boolean"}
                aria-sort={dir === "asc"
                  ? "ascending"
                  : dir === "desc"
                    ? "descending"
                    : "none"}
              >
                <div class="thInner">
                  {#if isFilterableColumn(column)}
                    <input
                      class="colFilter"
                      type="text"
                      placeholder="filter"
                      autocomplete="off"
                      aria-label={`Filter ${column.label}`}
                      value={columnFilters[column.key] ?? ""}
                      oninput={(event) =>
                        setColumnFilter(column.key, event.currentTarget.value)}
                    />
                  {:else}
                    <span class="colFilter colFilter--none" aria-hidden="true"
                    ></span>
                  {/if}
                  <button
                    type="button"
                    class="sortBtn"
                    class:sortBtn--active={dir !== null}
                    title={`Sort by ${column.label}`}
                    onclick={() => toggleSort(column.key)}
                  >
                    <span>{column.label}</span>
                    <span class="sortBadge" aria-hidden="true"
                      >{dir === "asc" ? "▲" : dir === "desc" ? "▼" : "↕"}</span
                    >
                  </button>
                </div>
              </th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#if displayRows.length === 0}
            <tr class="emptyRow">
              <td colspan={Math.max(1, model.columns.length)}
                >No rows match the filters.</td
              >
            </tr>
          {/if}
          {#each displayRows as row, index (`${rowId(row) ?? index}`)}
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
                } else if (event.key === "ArrowDown") {
                  event.preventDefault();
                  moveSelection(1);
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  moveSelection(-1);
                }
              }}
            >
              {#each model.columns as column (column.key)}
                <td class:tdBool={column.type === "boolean"}>
                  {#if column.type === "boolean"}
                    <KickagentBoolMark value={row[column.key]} />
                  {:else}
                    {formatPresentationCell(row[column.key], column.type)}
                  {/if}
                </td>
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
    --list-head-height: 3.6rem;
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

  /* Detail no longer fits above the list floor: size to content so main scrolls. */
  .split--pageScroll {
    flex: 0 0 auto;
    min-height: min-content;
    overflow: visible;
  }

  .split--console {
    flex: 0 0 auto;
    min-height: unset;
    margin: 0.75rem 0 1rem;
  }

  .tableWrap {
    flex: 1 1 0;
    min-height: var(--list-min-height);
    border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
    border-radius: 8px;
    overflow: hidden;
    background: var(--resource-table-bg, #fff);
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .split--pageScroll .tableWrap {
    flex: 0 0 var(--list-min-height);
    height: var(--list-min-height);
  }

  .split--console .tableWrap {
    flex: 0 0 auto;
    height: auto;
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
    flex: 0 0 auto;
    min-height: min-content;
    overflow: visible;
    display: flex;
    flex-direction: column;
  }

  .detailSlot :global(.detailPane) {
    flex: 0 0 auto;
    height: auto;
    min-height: unset;
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
    vertical-align: bottom;
  }

  .thInner {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    align-items: flex-start;
  }

  .colFilter {
    box-sizing: border-box;
    width: 100%;
    min-width: 4.5rem;
    height: 1.45rem;
    font: inherit;
    font-size: 0.72rem;
    letter-spacing: 0;
    text-transform: none;
    padding: 0.1rem 0.4rem;
    border: 1px solid color-mix(in srgb, currentColor 20%, transparent);
    border-radius: 4px;
    background: var(--resource-filter-input-bg, #fff);
    color: inherit;
  }

  .colFilter--none {
    display: block;
    border: 0;
    background: transparent;
  }

  .sortBtn {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0;
    border: 0;
    background: transparent;
    font: inherit;
    letter-spacing: inherit;
    text-transform: inherit;
    color: inherit;
    cursor: pointer;
  }

  .sortBadge {
    font-size: 0.65rem;
    opacity: 0;
  }

  .sortBtn:hover .sortBadge,
  .sortBtn:focus-visible .sortBadge {
    opacity: 0.45;
  }

  .sortBtn--active .sortBadge,
  .sortBtn--active:hover .sortBadge {
    opacity: 1;
  }

  .emptyRow td {
    cursor: default;
    color: color-mix(in srgb, currentColor 55%, transparent);
  }

  .thBool,
  .tdBool {
    text-align: center;
  }

  .thBool .thInner {
    align-items: center;
  }

  tr {
    cursor: pointer;
  }

  tr.selected {
    background: color-mix(in srgb, #1565c0 14%, transparent);
  }
</style>
