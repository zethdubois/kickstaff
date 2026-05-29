<script lang="ts">
  import { formatPresentationCell } from "./formatPresentationCell";
  import type { ResourceTableModel } from "./outcomeToTableModel";

  type Props = {
    model: ResourceTableModel;
    title?: string;
    variant?: "console" | "page";
  };

  let { model, title = "Results", variant = "page" }: Props = $props();

  function rowCount(meta: Record<string, unknown>): string | null {
    const count = meta.count;
    const shown = model.rows.length;
    if (typeof count === "number" && Number.isFinite(count)) {
      return `${shown} shown of ${count}`;
    }
    return shown > 0 ? `${shown} row(s)` : null;
  }

  const summary = $derived(rowCount(model.meta));
</script>

<section
  class="resourceTable"
  class:resourceTable--console={variant === "console"}
  aria-label={title}
>
  <header class="head">
    <span class="title">{title}</span>
    {#if summary}
      <span class="meta">{summary}</span>
    {/if}
  </header>
  <div class="scroll">
    <table>
      <thead>
        <tr>
          {#each model.columns as col (col.key)}
            <th>{col.label}</th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each model.rows as row, i (`${row[model.primaryKey] ?? i}`)}
          <tr>
            {#each model.columns as col (col.key)}
              <td>{formatPresentationCell(row[col.key], col.type)}</td>
            {/each}
          </tr>
        {:else}
          <tr>
            <td colspan={model.columns.length} class="empty">No rows</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</section>

<style>
  .resourceTable {
    margin: 0.75rem 0 1rem;
    border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
    border-radius: 8px;
    overflow: hidden;
    background: var(--resource-table-bg, #fff);
  }

  .resourceTable--console {
    margin: 0.35rem 0 0.5rem;
    border-color: #2a3548;
    border-radius: 6px;
    background: #0e1219;
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

  .resourceTable--console .head {
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

  .resourceTable--console .title {
    font-size: 0.72rem;
    letter-spacing: 0.06em;
    color: #62d4a3;
  }

  .meta {
    font-size: 0.75rem;
    color: color-mix(in srgb, currentColor 55%, transparent);
  }

  .resourceTable--console .meta {
    font-size: 0.68rem;
    color: #7a8496;
  }

  .scroll {
    overflow-x: auto;
    max-height: min(70vh, 32rem);
    overflow-y: auto;
  }

  .resourceTable--console .scroll {
    max-height: 14rem;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  .resourceTable--console table {
    font-size: 0.72rem;
  }

  th,
  td {
    padding: 0.4rem 0.6rem;
    text-align: left;
    border-bottom: 1px solid color-mix(in srgb, currentColor 10%, transparent);
    white-space: nowrap;
  }

  .resourceTable--console th,
  .resourceTable--console td {
    padding: 0.25rem 0.45rem;
    border-bottom-color: #1a1f29;
  }

  th {
    position: sticky;
    top: 0;
    background: color-mix(in srgb, currentColor 6%, transparent);
    font-weight: 600;
    color: color-mix(in srgb, currentColor 70%, transparent);
  }

  .resourceTable--console th {
    background: #151a24;
    color: #9aa3b3;
  }

  tr:hover td {
    background: color-mix(in srgb, currentColor 4%, transparent);
  }

  .resourceTable--console tr:hover td {
    background: #131822;
  }

  .empty {
    text-align: center;
    padding: 1rem;
    color: color-mix(in srgb, currentColor 50%, transparent);
  }

  .resourceTable--console .empty {
    color: #5a6373;
    padding: 0.6rem;
  }
</style>
