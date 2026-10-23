<!--
  @docs: docs/sop-svelte-and-components.md
  @component: KickagentListFilters.svelte
-->
<script lang="ts">
  import {
    buildListFilterArgs,
    type ListFilterValues,
  } from "./listDetailForm";
  import type { ManifestListFilter } from "./manifestResourceCache";

  type Props = {
    filters: ManifestListFilter[];
    command?: string;
    onRun: (args: string[]) => Promise<void>;
    loading?: boolean;
    variant?: "console" | "page";
  };

  let {
    filters,
    command = "list",
    onRun,
    loading = false,
    variant = "page",
  }: Props = $props();

  let values = $state<ListFilterValues>({});

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    await onRun(buildListFilterArgs(filters, values));
  }

  function clearFilters() {
    values = {};
  }
</script>

{#if filters.length > 0}
  <form
    class="filters"
    class:filters--console={variant === "console"}
    onsubmit={submit}
    aria-label="List filters"
  >
    <div class="filterRow">
      {#each filters as filter (filter.key)}
        {#if filter.match === "presence"}
          <label class="check">
            <input
              type="checkbox"
              disabled={loading}
              checked={values[filter.key] === true}
              onchange={(event) => {
                values = {
                  ...values,
                  [filter.key]: event.currentTarget.checked,
                };
              }}
            />
            <span class="label">{filter.label}</span>
          </label>
        {:else}
          <label class="field">
            <span class="label">{filter.label}</span>
            <input
              type="text"
              placeholder={filter.match === "wildcard" ? "*pattern*" : ""}
              disabled={loading}
              bind:value={
                () => String(values[filter.key] ?? ""),
                (v) => {
                  values = { ...values, [filter.key]: v };
                }
              }
            />
          </label>
        {/if}
      {/each}
      <div class="actions">
        <button type="submit" class="run" disabled={loading}>
          {loading ? "Loading…" : `Run ${command}`}
        </button>
        <button
          type="button"
          class="clear"
          disabled={loading}
          onclick={clearFilters}>Clear</button
        >
      </div>
    </div>
  </form>
{/if}

<style>
  .filters {
    margin: 0.5rem 0;
    padding: 0.55rem 0.85rem;
    border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
    border-radius: 8px;
    background: color-mix(in srgb, currentColor 3%, transparent);
  }

  .filters--console {
    margin: 0.35rem 0;
    padding: 0.35rem 0.5rem;
    border-color: #2a3548;
    border-radius: 6px;
    background: #0e1219;
  }

  .filterRow {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.55rem 0.9rem;
  }

  .field {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    min-width: 0;
  }

  .check {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.9rem;
    white-space: nowrap;
  }

  .label {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: color-mix(in srgb, currentColor 55%, transparent);
    white-space: nowrap;
  }

  .check .label {
    text-transform: none;
    letter-spacing: 0;
    font-size: 0.9rem;
    color: inherit;
  }

  .filters--console .check {
    font-size: 0.8rem;
  }

  .filters--console .label {
    font-size: 0.52rem;
    color: #7a8496;
  }

  .filters--console .check .label {
    font-size: 0.68rem;
    color: #d6d8de;
  }

  .field input {
    font: inherit;
    font-size: 0.875rem;
    padding: 0.3rem 0.5rem;
    min-width: 7rem;
    border: 1px solid color-mix(in srgb, currentColor 22%, transparent);
    border-radius: 4px;
    background: var(--resource-filter-input-bg, #fff);
    color: inherit;
  }

  .filters--console .run,
  .filters--console .clear {
    font-size: 0.775rem;
  }

  .filters--console .field input {
    font-size: 0.62rem;
    padding: 0.2rem 0.35rem;
    min-width: 5rem;
    border-color: #2a3548;
    background: #0b0d11;
    color: #d6d8de;
  }

  .actions {
    display: inline-flex;
    gap: 0.4rem;
    margin-left: auto;
  }

  .run,
  .clear {
    font: inherit;
    font-size: 0.875rem;
    padding: 0.3rem 0.7rem;
    border-radius: 4px;
    cursor: pointer;
    border: 1px solid color-mix(in srgb, currentColor 22%, transparent);
    white-space: nowrap;
  }

  .run {
    background: color-mix(in srgb, currentColor 8%, transparent);
    font-weight: 600;
  }

  .clear {
    background: transparent;
    color: color-mix(in srgb, currentColor 65%, transparent);
  }

  .run:disabled,
  .clear:disabled {
    opacity: 0.6;
    cursor: wait;
  }
</style>
