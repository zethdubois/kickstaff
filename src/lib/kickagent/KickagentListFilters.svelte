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
    <div class="filterGrid">
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
    </div>
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
  </form>
{/if}

<style>
  .filters {
    margin: 0.75rem 0;
    padding: 0.75rem 1rem;
    border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
    border-radius: 8px;
    background: color-mix(in srgb, currentColor 3%, transparent);
  }

  .filters--console {
    margin: 0.35rem 0;
    padding: 0.45rem 0.5rem;
    border-color: #2a3548;
    border-radius: 6px;
    background: #0e1219;
  }

  .filterGrid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
    gap: 0.5rem 0.75rem;
    align-items: end;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    min-width: 0;
  }

  .check {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding-bottom: 0.35rem;
    font-size: 0.9rem;
  }

  .label {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: color-mix(in srgb, currentColor 55%, transparent);
  }

  .check .label {
    text-transform: none;
    letter-spacing: 0;
    font-size: 0.9rem;
    color: inherit;
  }

  .filters--console .label {
    font-size: 0.62rem;
    color: #7a8496;
  }

  .filters--console .check .label {
    font-size: 0.78rem;
    color: #d6d8de;
  }

  .field input {
    font: inherit;
    font-size: 0.875rem;
    padding: 0.35rem 0.5rem;
    border: 1px solid color-mix(in srgb, currentColor 22%, transparent);
    border-radius: 4px;
    background: var(--resource-filter-input-bg, #fff);
    color: inherit;
  }

  .filters--console .field input {
    font-size: 0.72rem;
    padding: 0.2rem 0.35rem;
    border-color: #2a3548;
    background: #0b0d11;
    color: #d6d8de;
  }

  .actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.6rem;
  }

  .run,
  .clear {
    font: inherit;
    font-size: 0.875rem;
    padding: 0.35rem 0.75rem;
    border-radius: 4px;
    cursor: pointer;
    border: 1px solid color-mix(in srgb, currentColor 22%, transparent);
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
