<!--
  @docs: docs/guides/console.md
  @component: StoreTree.svelte
-->
<script lang="ts">
  import { opsListSnapshot } from "$lib/client/opsListCache.svelte";

  const snapshot = $derived(opsListSnapshot());
  let opened = $state<Record<string, boolean>>({});

  function isBranch(value: unknown): value is Record<string, unknown> | unknown[] {
    return !!value && typeof value === "object";
  }

  function isOpen(path: string): boolean {
    if (path in opened) return opened[path];
    const depth = path ? path.split(".").length : 0;
    return depth <= 1;
  }

  function toggle(path: string) {
    opened[path] = !isOpen(path);
  }

  function preview(value: unknown): string {
    if (Array.isArray(value)) return `(${value.length})`;
    if (value && typeof value === "object") return `{${Object.keys(value).length}}`;
    return "";
  }

  function formatLeaf(value: unknown): string {
    if (value == null) return "null";
    if (typeof value === "string") return value;
    return String(value);
  }

  function recordLabel(key: string, value: unknown): string {
    if (!value || typeof value !== "object" || Array.isArray(value)) return key;
    const name = (value as Record<string, unknown>).name;
    return typeof name === "string" && name ? `${key}  ${name}` : key;
  }

  function rowLabel(value: unknown, index: number): string {
    if (!value || typeof value !== "object" || Array.isArray(value)) return String(index);
    const row = value as Record<string, unknown>;
    const id = row.id ?? row.number ?? index;
    const name = row.name ?? row.label ?? row.title;
    return typeof name === "string" && name ? `${id}  ${name}` : String(id);
  }

  function childrenOf(
    value: Record<string, unknown> | unknown[],
    path: string,
  ): { label: string; value: unknown; path: string }[] {
    if (Array.isArray(value)) {
      return value.map((item, index) => ({
        label: rowLabel(item, index),
        value: item,
        path: path ? `${path}.${index}` : String(index),
      }));
    }
    return Object.entries(value).map(([key, item]) => ({
      label: recordLabel(key, item),
      value: item,
      path: path ? `${path}.${key}` : key,
    }));
  }
</script>

{#snippet branch(label: string, value: unknown, path: string)}
  {#if isBranch(value)}
    <div class="node">
      <button
        type="button"
        class="twig"
        aria-expanded={isOpen(path)}
        onclick={() => toggle(path)}
      >
        <span class="mark" aria-hidden="true">{isOpen(path) ? "▾" : "▸"}</span>
        <span class="key">{label}</span>
        {#if !isOpen(path)}
          <span class="sum">{preview(value)}</span>
        {/if}
      </button>
      {#if isOpen(path)}
        <div class="kids">
          {#each childrenOf(value, path) as child (child.path)}
            {@render branch(child.label, child.value, child.path)}
          {/each}
        </div>
      {/if}
    </div>
  {:else}
    <div class="leaf">
      <span class="key">{label}</span>
      <span class="val" title={formatLeaf(value)}>{formatLeaf(value)}</span>
    </div>
  {/if}
{/snippet}

<div class="tree" aria-label="Ops list store">
  {#if Object.keys(snapshot).length === 0}
    <p class="empty">store is empty</p>
  {:else}
    {@render branch("ops lists", snapshot, "")}
  {/if}
</div>

<style>
  .tree {
    padding: 0.35rem 0.5rem 0.75rem 10px;
    font-size: 0.68rem;
    line-height: 1.35;
  }

  .empty {
    margin: 0.4rem 0;
    color: #6a7384;
  }

  .node,
  .leaf {
    min-width: 0;
  }

  .twig {
    appearance: none;
    display: flex;
    align-items: baseline;
    gap: 0.35rem;
    width: 100%;
    padding: 0.08rem 0;
    border: 0;
    background: transparent;
    color: #d6d8de;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .twig:hover {
    color: #fff;
  }

  .mark {
    flex: 0 0 auto;
    width: 0.8rem;
    color: #6a7384;
  }

  .key {
    color: #8ab4f8;
  }

  .sum,
  .val {
    color: #9aa3b3;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .leaf {
    display: flex;
    gap: 0.5rem;
    padding: 0.06rem 0 0.06rem 0.8rem;
    min-width: 0;
  }

  .leaf .val {
    color: #d4ebe0;
  }

  .kids {
    margin-left: 0.7rem;
    border-left: 1px solid #1d2129;
    padding-left: 0.35rem;
  }
</style>
