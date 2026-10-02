<!--
  @docs: docs/sop-svelte-and-components.md
  @component: KickagentListDetailPane.svelte
-->
<script lang="ts">
  import type { ManifestListDetailField } from "./manifestResourceCache";
  import { formatReadonlyField } from "./presentationFieldInput";

  type Props = {
    titleKey: string;
    fields: ManifestListDetailField[];
    record: Record<string, unknown> | null;
    loading?: boolean;
    saving?: boolean;
    error?: string | null;
    variant?: "console" | "page";
    onSave?: (draft: Record<string, unknown>) => Promise<string | void>;
  };

  let {
    titleKey,
    fields,
    record,
    loading = false,
    saving = false,
    error = null,
    variant = "page",
    onSave,
  }: Props = $props();

  let draft = $state<Record<string, unknown>>({});
  let status = $state<string | null>(null);
  let syncedKey = "";

  const title = $derived.by(() => {
    if (!record) return "Details";
    const value = record[titleKey];
    return value != null && value !== "" ? String(value) : "Details";
  });

  const editableFields = $derived(fields.filter((field) => field.editable));
  const readonlyFields = $derived(fields.filter((field) => !field.editable));
  const busy = $derived(loading || saving);

  $effect(() => {
    const id = record ? String(record.id ?? record.number ?? "") : "";
    const revision = record
      ? `${String(record.updatedAt ?? "")}|${String(record.retiredAt ?? "")}|${String(record.hidden ?? "")}`
      : "";
    const key = `${id}|${revision}`;
    if (key === syncedKey) return;
    const previousId = syncedKey.split("|")[0] ?? "";
    syncedKey = key;
    draft = record ? { ...record } : {};
    if (previousId && previousId !== id) status = null;
  });

  function setField(key: string, value: unknown) {
    draft = { ...draft, [key]: value };
    status = null;
  }

  function optionsFor(field: ManifestListDetailField, current: unknown): string[] {
    const options = [...(field.options ?? [])];
    const value = current == null ? "" : String(current);
    if (value && !options.includes(value)) options.unshift(value);
    return options;
  }

  async function save(event: SubmitEvent) {
    event.preventDefault();
    if (!onSave || busy) return;
    status = null;
    const message = await onSave({ ...draft });
    if (message) status = message;
  }
</script>

<section
  class="detailPane"
  class:detailPane--console={variant === "console"}
  aria-label="Record details"
>
  <header class="head">
    <h2 class="title">{title}</h2>
    {#if loading}
      <span class="status">Loading…</span>
    {:else if saving}
      <span class="status">Saving…</span>
    {/if}
  </header>

  {#if error}
    <p class="err" role="alert">{error}</p>
  {:else if !record && !loading}
    <p class="placeholder">Select a row from the list.</p>
  {:else if record}
    <form class="form" onsubmit={save}>
      {#if readonlyFields.length > 0}
        <fieldset class="group">
          <legend class="groupLabel">Read-only</legend>
          <dl class="readonlyGrid">
            {#each readonlyFields as field (field.key)}
              <div class="readonlyRow">
                <dt>{field.label}</dt>
                <dd>{formatReadonlyField(record[field.key], field.type)}</dd>
              </div>
            {/each}
          </dl>
        </fieldset>
      {/if}

      {#if editableFields.length > 0}
        <fieldset class="group">
          <legend class="groupLabel">Fields</legend>
          <div class="fieldGrid">
            {#each editableFields as field (field.key)}
              <label class="field">
                <span class="label">{field.label}</span>
                {#if field.type === "boolean"}
                  <input
                    type="checkbox"
                    checked={draft[field.key] === true}
                    disabled={busy}
                    onchange={(event) =>
                      setField(field.key, event.currentTarget.checked)}
                  />
                {:else if field.options && field.options.length > 0}
                  <select
                    disabled={busy}
                    value={draft[field.key] == null
                      ? ""
                      : String(draft[field.key])}
                    onchange={(event) =>
                      setField(field.key, event.currentTarget.value)}
                  >
                    {#each optionsFor(field, draft[field.key]) as option (option)}
                      <option value={option}>{option}</option>
                    {/each}
                  </select>
                {:else}
                  <input
                    type="text"
                    disabled={busy}
                    value={draft[field.key] == null
                      ? ""
                      : String(draft[field.key])}
                    oninput={(event) =>
                      setField(field.key, event.currentTarget.value)}
                  />
                {/if}
              </label>
            {/each}
          </div>
        </fieldset>

        <div class="actions">
          <button type="submit" class="save" disabled={busy || !onSave}>
            {saving ? "Saving…" : "Save"}
          </button>
          {#if status}
            <p class="note" role="status">{status}</p>
          {/if}
        </div>
      {/if}
    </form>
  {/if}
</section>

<style>
  .detailPane {
    display: flex;
    flex-direction: column;
    min-height: 16rem;
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

  .title {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 700;
  }

  .status,
  .note {
    font-size: 0.75rem;
    color: color-mix(in srgb, currentColor 55%, transparent);
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

  .readonlyGrid {
    margin: 0;
    display: grid;
    gap: 0.35rem 0.75rem;
  }

  .readonlyRow {
    display: grid;
    grid-template-columns: 8.5rem 1fr;
    gap: 0.5rem;
    font-size: 0.85rem;
  }

  .readonlyRow dt {
    margin: 0;
    color: color-mix(in srgb, currentColor 60%, transparent);
    font-weight: 600;
  }

  .readonlyRow dd {
    margin: 0;
    word-break: break-word;
  }

  .fieldGrid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
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
  }

  .field input:not([type="checkbox"]),
  .field select {
    font: inherit;
    font-size: 0.875rem;
    padding: 0.4rem 0.55rem;
    border: 1px solid color-mix(in srgb, currentColor 22%, transparent);
    border-radius: 4px;
    background: var(--resource-filter-input-bg, #fff);
    color: inherit;
  }

  .field input[type="checkbox"] {
    width: 1rem;
    height: 1rem;
    align-self: flex-start;
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .save {
    font: inherit;
    font-size: 0.9rem;
    padding: 0.4rem 0.75rem;
    border-radius: 6px;
    border: 1px solid color-mix(in srgb, currentColor 25%, transparent);
    background: color-mix(in srgb, currentColor 8%, transparent);
    cursor: pointer;
  }

  .save:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .note {
    margin: 0;
  }
</style>
