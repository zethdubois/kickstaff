<script lang="ts">
  import type { ManifestUnitsListResource } from "./manifestResourceCache";

  type FilterValues = Record<string, string>;

  type Props = {
    schema: ManifestUnitsListResource;
    onRun: (args: string[]) => Promise<void>;
    loading?: boolean;
    variant?: "console" | "page";
  };

  let { schema, onRun, loading = false, variant = "page" }: Props = $props();

  let values = $state<FilterValues>({});

  function buildArgs(): string[] {
    const args: string[] = [];
    for (const filter of schema.filters) {
      const raw = values[filter.key]?.trim();
      if (!raw) continue;
      args.push(filter.flag, raw);
    }
    return args;
  }

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    await onRun(buildArgs());
  }

  function clearFilters() {
    values = {};
  }
</script>

{#if schema.filters.length > 0}
  <form
    class="filters"
    class:filters--console={variant === "console"}
    onsubmit={submit}
    aria-label="List filters"
  >
    <div class="filterGrid">
      {#each schema.filters as filter (filter.key)}
        <label class="field">
          <span class="label">{filter.label}</span>
          <input
            type="text"
            placeholder={filter.match === "wildcard" ? "*pattern*" : ""}
            disabled={loading}
            bind:value={
              () => values[filter.key] ?? "",
              (v) => {
                values = { ...values, [filter.key]: v };
              }
            }
          />
        </label>
      {/each}
    </div>
    <div class="actions">
      <button type="submit" class="run" disabled={loading}>
        {loading ? "Loading…" : `Run ${schema.command}`}
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
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    min-width: 0;
  }

  .label {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: color-mix(in srgb, currentColor 55%, transparent);
  }

  .filters--console .label {
    font-size: 0.62rem;
    color: #7a8496;
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

  .field input:focus {
    outline: 2px solid color-mix(in srgb, currentColor 35%, transparent);
    outline-offset: 1px;
  }

  .filters--console .field input:focus {
    outline: 1px solid #62d4a3;
    border-color: #62d4a3;
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

  .filters--console .run,
  .filters--console .clear {
    font-size: 0.7rem;
    padding: 0.25rem 0.55rem;
    border-color: #2a3548;
  }

  .run {
    background: color-mix(in srgb, currentColor 8%, transparent);
    font-weight: 600;
  }

  .filters--console .run {
    background: #1a3d2e;
    color: #62d4a3;
    border-color: #2d5c45;
  }

  .filters--console .run:hover:not(:disabled) {
    background: #224a38;
  }

  .clear {
    background: transparent;
    color: color-mix(in srgb, currentColor 65%, transparent);
  }

  .filters--console .clear:hover:not(:disabled) {
    background: #1a1f29;
  }

  .run:disabled,
  .clear:disabled {
    opacity: 0.6;
    cursor: wait;
  }
</style>
