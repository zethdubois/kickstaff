<!--
  @docs: docs/sop-svelte-and-components.md
  @component: KickagentResourceList.svelte
-->
<script lang="ts">
  import { tick } from "svelte";
  import type { ResourceTableModel } from "./outcomeToTableModel";
  import {
    listItemsFromModel,
    resolveListLabelKey,
    type ResourceListItem,
  } from "./resourceListModel";
  import type { UnitsListActionSet } from "./unitsListActions";

  type Props = {
    model: ResourceTableModel;
    actions: UnitsListActionSet;
    title?: string;
    variant?: "console" | "page";
    /** When set, list is a column inside a split container (no outer chrome). */
    layout?: "standalone" | "pane";
    labelKey?: string;
    /** Fired when the highlighted row changes (including initial selection). */
    onSelectedChange?: (item: ResourceListItem) => void;
    onSelectionCleared?: () => void;
  };

  let {
    model,
    actions,
    title = "Results",
    variant = "page",
    layout = "standalone",
    labelKey,
    onSelectedChange,
    onSelectionCleared,
  }: Props = $props();

  const resolvedLabelKey = $derived(labelKey ?? resolveListLabelKey(model));
  const items = $derived(listItemsFromModel(model, resolvedLabelKey));

  let listEl: HTMLDivElement | undefined = $state();
  let menuEl: HTMLUListElement | undefined = $state();

  let selectedIndex = $state(0);
  let menuOpen = $state(false);
  let menuIndex = $state(0);
  let actionBusy = $state(false);
  let actionError = $state<string | null>(null);

  const summary = $derived.by(() => {
    const count = model.meta.count;
    const shown = items.length;
    if (typeof count === "number" && Number.isFinite(count)) {
      return `${shown} shown of ${count}`;
    }
    return shown > 0 ? `${shown} row(s)` : null;
  });

  const selectedItem = $derived(items[selectedIndex] ?? null);
  const menuActions = $derived(actions.secondary);

  function clampIndex(index: number, len: number): number {
    if (len <= 0) return 0;
    return Math.max(0, Math.min(index, len - 1));
  }

  async function focusList() {
    await tick();
    listEl?.focus({ preventScroll: true });
  }

  async function scrollSelectedIntoView() {
    await tick();
    const item = items[selectedIndex];
    if (!item || !listEl) return;
    listEl
      .querySelector(`#resource-list-option-${CSS.escape(item.key)}`)
      ?.scrollIntoView({ block: "nearest" });
  }

  function resetSelection() {
    selectedIndex = 0;
    menuOpen = false;
    menuIndex = 0;
    actionError = null;
  }

  $effect(() => {
    const len = items.length;
    const signature = items.map((i) => i.key).join("\0");
    void signature;
    resetSelection();
    if (len > 0) {
      void focusList();
      void scrollSelectedIntoView();
    } else {
      onSelectionCleared?.();
    }
  });

  $effect(() => {
    const item = selectedItem;
    if (item) onSelectedChange?.(item);
  });

  $effect(() => {
    if (!menuOpen) return;
    void tick().then(() => {
      const btn = menuEl?.querySelector<HTMLButtonElement>(
        `[data-menu-index="${menuIndex}"]`,
      );
      btn?.focus({ preventScroll: true });
    });
  });

  async function runAction(
    action: { run: (item: ResourceListItem) => void | Promise<void> },
    item: ResourceListItem,
  ) {
    if (actionBusy) return;
    actionBusy = true;
    actionError = null;
    try {
      await action.run(item);
    } catch (e) {
      actionError = e instanceof Error ? e.message : String(e);
    } finally {
      actionBusy = false;
    }
  }

  async function activatePrimary() {
    const item = selectedItem;
    if (!item || actionBusy) return;
    menuOpen = false;
    await runAction(actions.primary, item);
    await focusList();
  }

  function openMenu() {
    if (items.length === 0) return;
    menuOpen = true;
    menuIndex = 0;
  }

  function closeMenu() {
    menuOpen = false;
    void focusList();
  }

  async function activateMenuItem() {
    const item = selectedItem;
    const action = menuActions[menuIndex];
    if (!item || !action) return;
    menuOpen = false;
    await runAction(action, item);
    await focusList();
  }

  function onListKeydown(e: KeyboardEvent) {
    if (items.length === 0) return;

    if (menuOpen) {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          menuIndex = clampIndex(menuIndex + 1, menuActions.length);
          break;
        case "ArrowUp":
          e.preventDefault();
          menuIndex = clampIndex(menuIndex - 1, menuActions.length);
          break;
        case "Enter":
          e.preventDefault();
          void activateMenuItem();
          break;
        case "Escape":
          e.preventDefault();
          closeMenu();
          break;
        case " ":
          e.preventDefault();
          closeMenu();
          break;
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        selectedIndex = clampIndex(selectedIndex + 1, items.length);
        void scrollSelectedIntoView();
        break;
      case "ArrowUp":
        e.preventDefault();
        selectedIndex = clampIndex(selectedIndex - 1, items.length);
        void scrollSelectedIntoView();
        break;
      case "Enter":
        e.preventDefault();
        void activatePrimary();
        break;
      case " ":
        e.preventDefault();
        openMenu();
        break;
      case "Escape":
        if (menuOpen) closeMenu();
        break;
    }
  }

  function onItemPointerDown(index: number) {
    selectedIndex = index;
    void focusList();
  }

  function onItemDblClick() {
    void activatePrimary();
  }
</script>

<section
  class="resourceList"
  class:resourceList--console={variant === "console"}
  class:resourceList--pane={layout === "pane"}
  aria-label={title}
>
  <header class="head">
    <span class="title">{title}</span>
    {#if summary}
      <span class="meta">{summary}</span>
    {/if}
  </header>

  {#if actionError}
    <p class="actionErr" role="alert">{actionError}</p>
  {/if}

  {#if layout === "standalone"}
    <p class="hint">
      ↑↓ move · Enter {actions.primary.label} · Space menu
    </p>
  {:else}
    <p class="hint">↑↓ move · Space menu</p>
  {/if}

  <div
    bind:this={listEl}
    class="list"
    role="listbox"
    tabindex="0"
    aria-label="{title} list"
    aria-activedescendant={selectedItem
      ? `resource-list-option-${selectedItem.key}`
      : undefined}
    onkeydown={onListKeydown}
  >
    {#each items as item, i (item.key)}
      <button
        type="button"
        id="resource-list-option-{item.key}"
        role="option"
        tabindex={-1}
        aria-selected={i === selectedIndex}
        class="option"
        class:option--selected={i === selectedIndex}
        onclick={() => {
          selectedIndex = i;
        }}
        onpointerdown={() => onItemPointerDown(i)}
        ondblclick={onItemDblClick}
      >
        <span class="optionLabel">{item.label}</span>
      </button>
    {:else}
      <p class="empty">No rows</p>
    {/each}

    {#if menuOpen && selectedItem}
      <ul
        bind:this={menuEl}
        class="contextMenu"
        role="menu"
        aria-label="Unit actions"
      >
        {#each menuActions as action, mi (action.id)}
          <li role="none">
            <button
              type="button"
              role="menuitem"
              data-menu-index={mi}
              class="contextMenu__item"
              class:contextMenu__item--active={mi === menuIndex}
              disabled={actionBusy}
              onclick={() => {
                menuIndex = mi;
                void activateMenuItem();
              }}
            >
              {action.label}
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</section>

<style>
  .resourceList {
    margin: 0.75rem 0 1rem;
    border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
    border-radius: 8px;
    overflow: hidden;
    background: var(--resource-table-bg, #fff);
    display: flex;
    flex-direction: column;
  }

  .resourceList--pane {
    margin: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
  }

  .resourceList--console {
    margin: 0.35rem 0 0.5rem;
    border-color: #2a3548;
    border-radius: 6px;
    background: #0e1219;
  }

  .resourceList--console.resourceList--pane {
    margin: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
  }

  .resourceList--pane .list {
    max-height: none;
    flex: 1;
  }

  .head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid color-mix(in srgb, currentColor 12%, transparent);
    background: color-mix(in srgb, currentColor 4%, transparent);
  }

  .resourceList--console .head {
    padding: 0.35rem 0.5rem;
    border-bottom-color: #1d2129;
    background: #121820;
  }

  .title {
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .resourceList--console .title {
    font-size: 0.72rem;
    letter-spacing: 0.06em;
    color: #62d4a3;
  }

  .meta {
    font-size: 0.75rem;
    color: color-mix(in srgb, currentColor 55%, transparent);
  }

  .resourceList--console .meta {
    font-size: 0.68rem;
    color: #7a8496;
  }

  .hint {
    margin: 0;
    padding: 0.35rem 0.75rem 0;
    font-size: 0.72rem;
    color: color-mix(in srgb, currentColor 52%, transparent);
  }

  .resourceList--console .hint {
    padding-inline: 0.5rem;
    color: #6a7384;
  }

  .actionErr {
    margin: 0;
    padding: 0.35rem 0.75rem;
    font-size: 0.82rem;
    color: #b71c1c;
    background: color-mix(in srgb, #c62828 10%, transparent);
  }

  .list {
    max-height: min(70vh, 32rem);
    overflow-y: auto;
    padding: 0.25rem 0;
    outline: none;
  }

  .resourceList--console .list {
    max-height: 14rem;
  }

  .list:focus-visible {
    outline: 2px solid color-mix(in srgb, #2563eb 55%, transparent);
    outline-offset: -2px;
  }

  .resourceList--console .list:focus-visible {
    outline-color: #62d4a3;
  }

  .option {
    position: relative;
    display: block;
    width: 100%;
    text-align: left;
    font: inherit;
    color: inherit;
    padding: 0.45rem 0.75rem;
    cursor: pointer;
    border: 0;
    border-bottom: 1px solid color-mix(in srgb, currentColor 8%, transparent);
    background: transparent;
  }

  .resourceList--console .option {
    padding: 0.3rem 0.5rem;
    border-bottom-color: #1a1f29;
  }

  .option:last-child {
    border-bottom: none;
  }

  .option--selected {
    background: #dbeafe;
    color: #0f172a;
  }

  .resourceList--console .option--selected {
    background: #1e3a5f;
    color: #e8f4fc;
  }

  .optionLabel {
    display: block;
    font-size: 0.9rem;
    line-height: 1.35;
    word-break: break-word;
  }

  .resourceList--console .optionLabel {
    font-size: 0.78rem;
  }

  .contextMenu {
    position: sticky;
    bottom: 0;
    z-index: 5;
    min-width: 12rem;
    margin: 0.35rem 0.5rem 0.5rem;
    padding: 0.25rem 0;
    list-style: none;
    border-radius: 6px;
    border: 1px solid color-mix(in srgb, currentColor 20%, transparent);
    background: Canvas;
    box-shadow: 0 8px 24px rgb(0 0 0 / 0.14);
  }

  .resourceList--console .contextMenu {
    border-color: #2a3548;
    background: #0f1218;
    box-shadow: 0 8px 20px rgb(0 0 0 / 0.45);
  }

  .contextMenu__item {
    display: block;
    width: 100%;
    text-align: left;
    font: inherit;
    font-size: 0.85rem;
    padding: 0.4rem 0.65rem;
    border: 0;
    background: transparent;
    color: inherit;
    cursor: pointer;
  }

  .contextMenu__item:hover,
  .contextMenu__item--active {
    background: color-mix(in srgb, #2563eb 18%, transparent);
  }

  .resourceList--console .contextMenu__item:hover,
  .resourceList--console .contextMenu__item--active {
    background: #1a2a3d;
    color: #8ab4f8;
  }

  .contextMenu__item:disabled {
    opacity: 0.6;
    cursor: wait;
  }

  .empty {
    text-align: center;
    padding: 1rem;
    color: color-mix(in srgb, currentColor 50%, transparent);
  }

  .resourceList--console .empty {
    color: #5a6373;
    padding: 0.6rem;
  }
</style>
