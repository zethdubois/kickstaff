<!--
  @docs: docs/sop-svelte-and-components.md
-->
<script lang="ts">
        import { onMount } from 'svelte';
        import { registerRefreshTarget, unregisterRefreshTarget } from '$lib/devConsole/refresh';

        let { data, form } = $props();
        let docs = $state<typeof data.docs>([]);
        let refreshBusy = $state(false);
        let refreshError = $state('');

        $effect(() => {
                docs = data.docs;
        });

        async function refreshRecentDocs() {
                refreshBusy = true;
                refreshError = '';
                try {
                        const res = await fetch('/api/admin/bills/recent');
                        if (!res.ok) {
                                const payload = (await res.json().catch(() => ({}))) as { message?: string };
                                throw new Error(payload.message ?? 'Failed to refresh recent documents.');
                        }
                        const payload = (await res.json()) as { docs: typeof data.docs };
                        docs = payload.docs;
                } catch (error) {
                        refreshError = error instanceof Error ? error.message : String(error);
                } finally {
                        refreshBusy = false;
                }
        }

        onMount(() => {
                registerRefreshTarget('bills.recent-docs', refreshRecentDocs);
                return () => unregisterRefreshTarget('bills.recent-docs');
        });

        function unitLinkFor(doc: {
                category: string;
                vendor: string;
                city: string;
                serviceAccountNumber: string | null;
        }) {
                const params = new URLSearchParams();
                params.set('category', doc.category);
                params.set('vendor', doc.vendor);
                params.set('city', doc.city);
                if (doc.serviceAccountNumber) params.set('service_account_number', doc.serviceAccountNumber);
                return `/tools/units?${params.toString()}`;
        }
</script>

<svelte:head>
        <title>Documents</title>
</svelte:head>

<div class="admin">
        <h1 class="admin__title">Documents</h1>
        <p class="admin__lead">
                Upload vendor bill PDFs (utility, insurance, taxes, …), then parse each document
                server-side.
        </p>

        {#if form?.message}
                <p class="admin__err" role="alert">{form.message}</p>
        {/if}
        {#if form?.uploaded}
                <p class="admin__ok" role="status">Uploaded document {form.id}.</p>
        {/if}
        {#if form?.duplicate}
                <p class="admin__ok" role="status">Duplicate skipped (existing id: {form.id}).</p>
        {/if}
        {#if form?.parsed}
                <p class="admin__ok" role="status">Parsed document {form.id}.</p>
        {/if}

        <form method="POST" action="?/upload" enctype="multipart/form-data" class="admin__form">
                <label class="field">
                        <span class="field__label">Category</span>
                        <select class="field__input" name="category">
                                {#each data.categories as c (c)}
                                        <option value={c} selected={c === 'utility'}>{c}</option>
                                {/each}
                        </select>
                </label>
                <label class="field">
                        <span class="field__label">Vendor</span>
                        <input class="field__input" name="vendor" type="text" value="city-of-moscow" required />
                </label>
                <label class="field">
                        <span class="field__label">City</span>
                        <input class="field__input" name="city" type="text" value="mos" required />
                </label>
                <label class="field">
                        <span class="field__label">PDF file</span>
                        <input class="field__input" name="pdf" type="file" accept="application/pdf,.pdf" required />
                </label>
                <button class="btn" type="submit">Upload PDF</button>
        </form>

        <section class="admin__list" aria-label="Bill documents">
                <div class="admin__listHead">
                        <h2 class="admin__h2">Recent documents</h2>
                        <button class="btn btn--compact" type="button" onclick={refreshRecentDocs} disabled={refreshBusy}>
                                {refreshBusy ? 'Refreshing...' : 'Refresh'}
                        </button>
                </div>
                {#if refreshError}
                        <p class="admin__err" role="alert">{refreshError}</p>
                {/if}
                <ul class="rows">
                        {#if docs.length === 0}
                                <li class="row">
                                        <span class="row__muted">No documents yet.</span>
                                </li>
                        {:else}
                                {#each docs as d (d.id)}
                                        <li class="row">
                                                <div>
                                                        <div class="row__name">{d.sourceFilename}</div>
                                                        <div class="row__meta">
                                                                {d.category} · {d.vendor} / {d.city} · {d.createdAt.toLocaleString()}
                                                        </div>
                                                        {#if d.parseStatus === 'parsed'}
                                                                <dl class="row__parsed">
                                                                        <div class="row__parsedItem">
                                                                                <dt>Account</dt>
                                                                                <dd>{d.serviceAccountNumber ?? '—'}</dd>
                                                                        </div>
                                                                        <div class="row__parsedItem">
                                                                                <dt>Reference</dt>
                                                                                <dd>{d.billReference ?? '—'}</dd>
                                                                        </div>
                                                                        <div class="row__parsedItem">
                                                                                <dt>Bill date</dt>
                                                                                <dd>{d.billDate ?? '—'}</dd>
                                                                        </div>
                                                                        <div class="row__parsedItem">
                                                                                <dt>Due date</dt>
                                                                                <dd>{d.dueDate ?? '—'}</dd>
                                                                        </div>
                                                                        <div class="row__parsedItem">
                                                                                <dt>Service period</dt>
                                                                                <dd>
                                                                                        {#if d.servicePeriodStart || d.servicePeriodEnd}
                                                                                                {d.servicePeriodStart ?? '—'} to {d.servicePeriodEnd ?? '—'}
                                                                                        {:else}
                                                                                                —
                                                                                        {/if}
                                                                                </dd>
                                                                        </div>
                                                                        <div class="row__parsedItem">
                                                                                <dt>Current charges</dt>
                                                                                <dd>{d.currentChargesAmount ?? '—'}</dd>
                                                                        </div>
                                                                </dl>
                                                                {#if d.linkedUnitId}
                                                                        <a class="row__mapLink" href="/tools/units/{d.linkedUnitId}">
                                                                                Linked: {d.linkedUnitLabel ?? 'Unit'}
                                                                        </a>
                                                                {:else if d.serviceAccountNumber}
                                                                        <a class="row__mapLink" href={unitLinkFor(d)}>Add bill account (first time)</a>
                                                                {/if}
                                                        {/if}
                                                        {#if d.parseError}
                                                                <div class="row__error">{d.parseError}</div>
                                                        {/if}
                                                </div>
                                                <div class="row__status">{d.parseStatus}</div>
                                                <form method="POST" action="?/parse" class="row__actions">
                                                        <input type="hidden" name="id" value={d.id} />
                                                        <button class="btn btn--compact" type="submit">Parse</button>
                                                </form>
                                        </li>
                                {/each}
                        {/if}
                </ul>
        </section>
</div>

<style>
        .admin { max-width: 56rem; margin: 0 auto; padding: 1.5rem 1.25rem 3rem; }
        .admin__title { margin: 0 0 0.35rem; font-size: 1.5rem; font-weight: 700; }
        .admin__lead { margin: 0 0 1.25rem; color: color-mix(in srgb, currentColor 72%, transparent); font-size: 0.95rem; }
        .admin__err { margin: 0 0 1rem; padding: 0.5rem 0.65rem; border-radius: 10px; background: color-mix(in srgb, #c0392b 12%, transparent); font-size: 0.9rem; }
        .admin__ok { margin: 0 0 1rem; padding: 0.5rem 0.65rem; border-radius: 10px; background: color-mix(in srgb, #1e8449 14%, transparent); font-size: 0.9rem; }
        .admin__form { display: grid; gap: 0.75rem; max-width: 26rem; margin-bottom: 1.25rem; }
        .field { display: grid; gap: 0.25rem; }
        .field__label { font-size: 0.82rem; font-weight: 600; }
        .field__input { font: inherit; padding: 0.45rem 0.55rem; border-radius: 10px; border: 1px solid color-mix(in srgb, currentColor 18%, transparent); }
        .btn { appearance: none; justify-self: start; font: inherit; padding: 0.45rem 0.85rem; border-radius: 10px; border: 1px solid color-mix(in srgb, currentColor 18%, transparent); background: color-mix(in srgb, currentColor 10%, transparent); cursor: pointer; font-weight: 650; }
        .btn--compact { padding: 0.3rem 0.55rem; font-size: 0.82rem; font-weight: 600; }
        .admin__h2 { font-size: 1.05rem; margin: 0 0 0.5rem; }
        .admin__listHead { display: flex; align-items: center; justify-content: space-between; gap: 0.6rem; }
        .rows { list-style: none; margin: 0; padding: 0; border: 1px solid color-mix(in srgb, currentColor 14%, transparent); border-radius: 12px; overflow: hidden; }
        .row { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 0.65rem 0.75rem; align-items: center; padding: 0.55rem 0.75rem; border-bottom: 1px solid color-mix(in srgb, currentColor 10%, transparent); font-size: 0.92rem; }
        .row:last-child { border-bottom: none; }
        .row__name { font-weight: 600; overflow-wrap: anywhere; }
        .row__meta { font-size: 0.8rem; color: color-mix(in srgb, currentColor 60%, transparent); }
        .row__status { font-size: 0.82rem; text-transform: uppercase; letter-spacing: 0.04em; color: color-mix(in srgb, currentColor 65%, transparent); }
        .row__error { margin-top: 0.2rem; font-size: 0.8rem; color: color-mix(in srgb, #c0392b 80%, transparent); }
        .row__actions { margin: 0; }
        .row__muted { color: color-mix(in srgb, currentColor 60%, transparent); }
        .row__parsed { margin: 0.45rem 0 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr)); gap: 0.25rem 0.75rem; }
        .row__parsedItem { margin: 0; }
        .row__parsedItem dt { margin: 0; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.04em; color: color-mix(in srgb, currentColor 55%, transparent); }
        .row__parsedItem dd { margin: 0.08rem 0 0; font-size: 0.82rem; color: color-mix(in srgb, currentColor 82%, transparent); overflow-wrap: anywhere; }
        .row__mapLink { display: inline-block; margin-top: 0.5rem; font-size: 0.82rem; text-decoration: underline; text-underline-offset: 0.12em; color: color-mix(in srgb, currentColor 80%, transparent); }
</style>
