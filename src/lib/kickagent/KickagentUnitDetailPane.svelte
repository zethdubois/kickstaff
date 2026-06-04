<!--
  @docs: docs/sop-svelte-and-components.md
  @component: KickagentUnitDetailPane.svelte
-->
<script lang="ts">
  import type { ManifestUnitsDetailResource } from "./manifestResourceCache";
  import { formatReadonlyField, inputTypeForField, valueToInputString } from "./presentationFieldInput";

  type Props = {
    schema: ManifestUnitsDetailResource;
    unit: Record<string, unknown> | null;
    loading?: boolean;
    error?: string | null;
    variant?: "console" | "page";
  };

  let {
    schema,
    unit,
    loading = false,
    error = null,
    variant = "page",
  }: Props = $props();

  const title = $derived.by(() => {
    if (!unit) return "Unit details";
    const t = unit[schema.titleKey];
    return t != null && t !== "" ? String(t) : "Unit details";
  });

  const readonlySet = $derived(new Set(schema.readonlyKeys));

  const readonlyFields = $derived(
    schema.readonlyKeys.map((key) => {
      const field = schema.fields.find((f) => f.key === key);
      return {
        key,
        label: field?.label ?? key,
        type: field?.type ?? ("string" as const),
      };
    }),
  );

  const formFields = $derived(
    schema.fields.filter((f) => !readonlySet.has(f.key)),
  );
</script>

<section
  class="detailPane"
  class:detailPane--console={variant === "console"}
  aria-label="Unit details"
>
  <header class="head">
    <h2 class="title">{title}</h2>
    {#if loading}
      <span class="status">Loading…</span>
    {/if}
  </header>

  {#if error}
    <p class="err" role="alert">{error}</p>
  {:else if !unit && !loading}
    <p class="placeholder">Select a unit from the list.</p>
  {:else if unit}
    <form class="form" onsubmit={(e) => e.preventDefault()}>
      {#if readonlyFields.length > 0}
        <fieldset class="group">
          <legend class="groupLabel">Read-only</legend>
          <dl class="readonlyGrid">
            {#each readonlyFields as field (field.key)}
              <div class="readonlyRow">
                <dt>{field.label}</dt>
                <dd>{formatReadonlyField(unit[field.key], field.type)}</dd>
              </div>
            {/each}
          </dl>
        </fieldset>
      {/if}

      <fieldset class="group">
        <legend class="groupLabel">Fields</legend>
        <div class="fieldGrid">
          {#each formFields as field (field.key)}
            {@const inputType = inputTypeForField(field.type)}
            {@const raw = unit[field.key]}
            <label class="field">
              <span class="label">
                {field.label}
                {#if field.required}<span class="req" aria-hidden="true">*</span>{/if}
              </span>
              {#if inputType === "checkbox"}
                <input
                  type="checkbox"
                  checked={raw === true}
                  disabled={!field.editable || loading}
                  aria-readonly={!field.editable}
                />
              {:else if inputType === "textarea"}
                <textarea
                  rows={4}
                  value={valueToInputString(raw, field.type)}
                  disabled={!field.editable || loading}
                  readonly={!field.editable}
                ></textarea>
              {:else}
                <input
                  type={inputType}
                  value={valueToInputString(raw, field.type)}
                  disabled={!field.editable || loading}
                  readonly={!field.editable}
                />
              {/if}
            </label>
          {/each}
        </div>
      </fieldset>
    </form>
  {/if}
</section>

<style>
  .detailPane {
    display: flex;
    flex-direction: column;
    min-height: min(70vh, 32rem);
    border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
    border-radius: 8px;
    background: var(--resource-table-bg, #fff);
    overflow: hidden;
  }

  .detailPane--console {
    min-height: 12rem;
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

  .detailPane--console .head {
    border-bottom-color: #1d2129;
    background: #121820;
  }

  .title {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 700;
    letter-spacing: -0.01em;
  }

  .detailPane--console .title {
    font-size: 0.82rem;
    color: #e2e4ea;
  }

  .status {
    font-size: 0.75rem;
    color: color-mix(in srgb, currentColor 55%, transparent);
  }

  .detailPane--console .status {
    color: #7a8496;
  }

  .err {
    margin: 0;
    padding: 0.65rem 0.75rem;
    font-size: 0.88rem;
    color: #b71c1c;
    background: color-mix(in srgb, #c62828 10%, transparent);
  }

  .placeholder {
    margin: 0;
    padding: 1.25rem 0.75rem;
    color: color-mix(in srgb, currentColor 55%, transparent);
    font-size: 0.9rem;
  }

  .detailPane--console .placeholder {
    color: #6a7384;
  }

  .form {
    flex: 1;
    overflow-y: auto;
    padding: 0.65rem 0.75rem 1rem;
  }

  .group {
    margin: 0 0 1rem;
    padding: 0;
    border: 0;
    min-width: 0;
  }

  .groupLabel {
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: color-mix(in srgb, currentColor 55%, transparent);
    margin-bottom: 0.45rem;
  }

  .detailPane--console .groupLabel {
    color: #7a8496;
  }

  .readonlyGrid {
    margin: 0;
    display: grid;
    gap: 0.35rem 0.75rem;
  }

  .readonlyRow {
    display: grid;
    grid-template-columns: 8rem 1fr;
    gap: 0.5rem;
    font-size: 0.85rem;
  }

  .readonlyRow dt {
    margin: 0;
    color: color-mix(in srgb, currentColor 60%, transparent);
    font-weight: 600;
  }

  .detailPane--console .readonlyRow dt {
    color: #9aa3b3;
  }

  .readonlyRow dd {
    margin: 0;
    word-break: break-word;
  }

  .fieldGrid {
    display: grid;
    gap: 0.65rem 0.75rem;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 0;
  }

  .label {
    font-size: 0.78rem;
    font-weight: 600;
    color: color-mix(in srgb, currentColor 70%, transparent);
  }

  .detailPane--console .label {
    color: #9aa3b3;
  }

  .req {
    color: #c62828;
  }

  .field input:not([type="checkbox"]),
  .field textarea {
    font: inherit;
    font-size: 0.875rem;
    padding: 0.4rem 0.55rem;
    border: 1px solid color-mix(in srgb, currentColor 22%, transparent);
    border-radius: 4px;
    background: var(--resource-filter-input-bg, #fff);
    color: inherit;
  }

  .detailPane--console .field input:not([type="checkbox"]),
  .detailPane--console .field textarea {
    border-color: #2a3548;
    background: #0b0d11;
    color: #d6d8de;
  }

  .field input:disabled,
  .field textarea:disabled {
    opacity: 0.85;
    cursor: not-allowed;
  }

  .field input[type="checkbox"] {
    width: 1rem;
    height: 1rem;
    align-self: flex-start;
  }
</style>
