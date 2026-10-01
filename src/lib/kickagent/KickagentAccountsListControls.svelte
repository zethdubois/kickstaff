<!--
  @docs: docs/sop-svelte-and-components.md
  @component: KickagentAccountsListControls.svelte
-->
<script lang="ts">
  import { buildGlListArgs } from "./glAccountForm";

  type Props = {
    onRun: (args: string[]) => Promise<void>;
    loading?: boolean;
    variant?: "console" | "page";
  };

  let { onRun, loading = false, variant = "page" }: Props = $props();

  let includeHidden = $state(false);
  let includeRetired = $state(false);
  let accountType = $state("");

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    await onRun(
      buildGlListArgs({ includeHidden, includeRetired, accountType }),
    );
  }
</script>

<form
  class="filters"
  class:filters--console={variant === "console"}
  onsubmit={submit}
  aria-label="Account list options"
>
  <label class="check">
    <input type="checkbox" bind:checked={includeHidden} disabled={loading} />
    Include hidden
  </label>
  <label class="check">
    <input type="checkbox" bind:checked={includeRetired} disabled={loading} />
    Include retired
  </label>
  <label class="type">
    <span class="label">Type</span>
    <input
      type="text"
      placeholder="Cash, Income, Expense…"
      bind:value={accountType}
      disabled={loading}
    />
  </label>
  <button type="submit" class="run" disabled={loading}>
    {loading ? "Loading…" : "Refresh"}
  </button>
</form>

<style>
  .filters {
    display: flex;
    flex-wrap: wrap;
    align-items: end;
    gap: 0.75rem 1rem;
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

  .check {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.9rem;
    padding-bottom: 0.35rem;
  }

  .type {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    min-width: 12rem;
  }

  .label {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: color-mix(in srgb, currentColor 55%, transparent);
  }

  .type input,
  .run {
    font: inherit;
    font-size: 0.875rem;
  }

  .type input {
    padding: 0.4rem 0.55rem;
    border: 1px solid color-mix(in srgb, currentColor 22%, transparent);
    border-radius: 4px;
    background: var(--resource-filter-input-bg, #fff);
    color: inherit;
  }

  .run {
    padding: 0.4rem 0.75rem;
    border-radius: 6px;
    border: 1px solid color-mix(in srgb, currentColor 25%, transparent);
    background: color-mix(in srgb, currentColor 8%, transparent);
    cursor: pointer;
  }

  .run:disabled,
  .type input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
