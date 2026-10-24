<!--
  @docs: docs/sop-svelte-and-components.md
  @component: KickagentListDetailPane.svelte
-->
<script lang="ts">
  import {
    confirmMessage,
    hasDisplayValue,
    irreversibleChanges,
    isFieldLocked,
    isStatusField,
    recordIdentityId,
  } from "./listDetailForm";
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

  const titleId = $derived(recordIdentityId(record, fields));

  /** Readonly meta: skip nulls, and skip the id shown in the title bar. */
  const metaFields = $derived(
    fields.filter((field) => {
      if (field.editable) return false;
      if (field.flag === "--id" || field.key === "id") return false;
      if (!record) return false;
      return hasDisplayValue(record[field.key]);
    }),
  );

  const valueFields = $derived(
    fields.filter((field) => field.editable && !isStatusField(field)),
  );
  const valueTextFields = $derived(
    valueFields.filter((field) => field.type !== "boolean"),
  );
  const valueBoolFields = $derived(
    valueFields.filter((field) => field.type === "boolean"),
  );
  const statusFields = $derived(
    fields.filter((field) => field.editable && isStatusField(field)),
  );

  const busy = $derived(loading || saving);

  $effect(() => {
    const id = record ? String(record.id ?? record.number ?? "") : "";
    const revision = record
      ? `${String(record.updatedAt ?? "")}|${String(record.retired ?? "")}|${String(record.retiredAt ?? "")}|${String(record.hidden ?? "")}`
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

  function optionsFor(
    field: ManifestListDetailField,
    current: unknown,
  ): string[] {
    const options = [...(field.options ?? [])];
    const value = current == null ? "" : String(current);
    if (value && !options.includes(value)) options.unshift(value);
    return options;
  }

  async function save(event: SubmitEvent) {
    event.preventDefault();
    if (!onSave || busy) return;
    status = null;

    // One-way fields (e.g. Retired): nothing is sent until the user confirms here.
    const oneWay = record ? irreversibleChanges(record, draft, fields) : [];
    if (oneWay.length > 0 && !window.confirm(confirmMessage(oneWay))) {
      status = "Not saved.";
      return;
    }

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
    {#if titleId}
      <span class="titleId" title="Record id">{titleId}</span>
    {/if}
    {#if loading}
      <span class="headStatus">Loading…</span>
    {:else if saving}
      <span class="headStatus">Saving…</span>
    {/if}
  </header>

  {#if error}
    <p class="err" role="alert">{error}</p>
  {:else if !record && !loading}
    <p class="placeholder">Select a row from the list.</p>
  {:else if record}
    <form class="form" onsubmit={save}>
      {#if metaFields.length > 0}
        <dl class="meta">
          {#each metaFields as field (field.key)}
            <div class="metaItem">
              <dt>{field.label}</dt>
              <dd>{formatReadonlyField(record[field.key], field.type)}</dd>
            </div>
          {/each}
        </dl>
      {/if}

      {#if valueTextFields.length > 0}
        <div class="fieldGrid">
          {#each valueTextFields as field (field.key)}
            <label class="field">
              <span class="label">{field.label}</span>
              {#if field.options && field.options.length > 0}
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
      {/if}

      {#if valueBoolFields.length > 0 || statusFields.length > 0}
        <div
          class="checkRow"
          class:checkRow--withStatus={statusFields.length > 0}
        >
          {#if valueBoolFields.length > 0}
            <ul class="attrChecks">
              {#each valueBoolFields as field (field.key)}
                <li>
                  <label class="check">
                    <input
                      type="checkbox"
                      checked={draft[field.key] === true}
                      disabled={busy}
                      onchange={(event) =>
                        setField(field.key, event.currentTarget.checked)}
                    />
                    <span>{field.label}</span>
                  </label>
                </li>
              {/each}
            </ul>
          {/if}

          {#if statusFields.length > 0}
            <fieldset class="statusCol">
              <legend class="statusLabel">Status</legend>
              <ul class="statusChecks">
                {#each statusFields as field (field.key)}
                  {@const locked = isFieldLocked(field, record)}
                  <li>
                    <label class="check" class:check--locked={locked}>
                      <input
                        type="checkbox"
                        checked={locked || draft[field.key] === true}
                        disabled={busy || locked}
                        title={locked
                          ? "Already set. This cannot be undone."
                          : undefined}
                        onchange={(event) =>
                          setField(field.key, event.currentTarget.checked)}
                      />
                      <span>{field.label}</span>
                    </label>
                  </li>
                {/each}
              </ul>
            </fieldset>
          {/if}
        </div>
      {/if}

      {#if valueFields.length > 0 || statusFields.length > 0}
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
    flex: 0 0 auto;
    height: auto;
    border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
    border-radius: 8px;
    background: var(--resource-table-bg, #fff);
    overflow: hidden;
  }

  .detailPane--console {
    border-color: #2a3548;
    border-radius: 6px;
    background: #0e1219;
  }

  .head {
    display: flex;
    flex-wrap: nowrap;
    align-items: baseline;
    gap: 0.75rem;
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid color-mix(in srgb, currentColor 12%, transparent);
    background: color-mix(in srgb, currentColor 4%, transparent);
  }

  .title {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 700;
    flex: 0 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .titleId {
    margin-left: auto;
    flex: 0 1 22rem;
    max-width: 55%;
    font-size: 0.68rem;
    font-weight: 500;
    font-style: italic;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    color: color-mix(in srgb, currentColor 42%, transparent);
    text-align: right;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .headStatus {
    flex: 0 0 auto;
    font-size: 0.75rem;
    color: color-mix(in srgb, currentColor 55%, transparent);
  }

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
    flex: 0 0 auto;
    overflow: visible;
    padding: 0.65rem 0.75rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
  }

  .meta {
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem 1.25rem;
    font-size: 0.82rem;
  }

  .metaItem {
    display: flex;
    gap: 0.4rem;
    min-width: 0;
  }

  .metaItem dt {
    margin: 0;
    color: color-mix(in srgb, currentColor 55%, transparent);
    font-weight: 600;
  }

  .metaItem dt::after {
    content: ":";
  }

  .metaItem dd {
    margin: 0;
    word-break: break-word;
  }

  .fieldGrid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
    gap: 0.55rem 0.75rem;
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

  /*
    Attribute checks fill columns 1–2; Status occupies the final (3rd) column.
    Without Status, attributes use up to 3 columns.
  */
  .checkRow {
    display: grid;
    gap: 0.65rem 1.25rem;
    align-items: start;
    width: 100%;
  }

  .checkRow--withStatus {
    grid-template-columns: minmax(9.5rem, 1fr) minmax(9.5rem, 1fr) minmax(
        10rem,
        1fr
      );
  }

  .checkRow--withStatus:not(:has(.attrChecks)) {
    grid-template-columns: minmax(10rem, 14rem);
  }

  .checkRow--withStatus:not(:has(.attrChecks)) .statusCol {
    grid-column: 1;
  }

  .checkRow:not(.checkRow--withStatus) {
    grid-template-columns: 1fr;
  }

  .attrChecks {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.4rem 1.25rem;
  }

  .checkRow--withStatus .attrChecks {
    grid-column: 1 / 3;
    grid-template-columns: 1fr 1fr;
  }

  .checkRow:not(.checkRow--withStatus) .attrChecks {
    grid-template-columns: repeat(
      auto-fill,
      minmax(max(9.5rem, calc((100% - 2.5rem) / 3)), 1fr)
    );
  }

  .statusCol {
    grid-column: 3;
    margin: 0;
    padding: 0.45rem 0.55rem 0.55rem;
    border: 1px solid color-mix(in srgb, currentColor 16%, transparent);
    border-radius: 6px;
    background: color-mix(in srgb, currentColor 3%, transparent);
    min-width: 0;
  }

  .statusLabel {
    padding: 0 0.2rem;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: color-mix(in srgb, currentColor 55%, transparent);
  }

  .statusChecks {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .check {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    font-size: 0.88rem;
    cursor: pointer;
  }

  .check input {
    width: 1rem;
    height: 1rem;
    margin: 0;
  }

  .check--locked {
    color: color-mix(in srgb, currentColor 55%, transparent);
    cursor: default;
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
