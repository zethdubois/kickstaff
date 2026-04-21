<!--
  @docs: docs/sop-svelte-and-components.md
-->
<script lang="ts">
	let { data, form } = $props();

	function assignLinkFor(unitId: string) {
		const params = new URLSearchParams();
		if (data.prefill.serviceAccountNumber)
			params.set('prefill_account', data.prefill.serviceAccountNumber);
		if (data.prefill.vendor) params.set('vendor', data.prefill.vendor);
		if (data.prefill.city) params.set('city', data.prefill.city);
		if (data.prefill.category) params.set('category', data.prefill.category);
		const qs = params.toString();
		return `/tools/units/${unitId}${qs ? `?${qs}` : ''}`;
	}

	const showBanner = $derived(Boolean(data.prefill.serviceAccountNumber));
</script>

<svelte:head>
	<title>Units</title>
</svelte:head>

<div class="units">
	<h1 class="units__title">Units</h1>
	<p class="units__lead">
		Real-estate records used to resolve Appfolio property codes and link vendor utility accounts.
	</p>

	{#if form?.message}
		<p class="units__err" role="alert">{form.message}</p>
	{/if}
	{#if form?.deleted}
		<p class="units__ok" role="status">Deleted unit {form.id}.</p>
	{/if}

	{#if showBanner}
		<aside class="units__banner" role="status">
			Assign account <code>{data.prefill.serviceAccountNumber}</code>
			{#if data.prefill.vendor} (<code>{data.prefill.vendor}</code>){/if}
			to a unit. Pick an existing unit below, or create a new one — the account form will be
			pre-filled.
		</aside>
	{/if}

	<section class="units__card">
		<h2 class="units__h2">Add unit</h2>
		<form method="POST" action="?/create" class="units__form">
			<label class="field">
				<span class="field__label">Label</span>
				<input class="field__input" name="label" type="text" placeholder="216 E 7th #A" required />
			</label>
			<label class="field">
				<span class="field__label">Street address</span>
				<input class="field__input" name="street_address" type="text" />
			</label>
			<div class="field__row">
				<label class="field">
					<span class="field__label">City</span>
					<input class="field__input" name="city" type="text" value={data.prefill.city} />
				</label>
				<label class="field">
					<span class="field__label">State</span>
					<input class="field__input" name="state" type="text" />
				</label>
				<label class="field">
					<span class="field__label">Postal code</span>
					<input class="field__input" name="postal_code" type="text" />
				</label>
			</div>
			<div class="field__row">
				<label class="field">
					<span class="field__label">Utility account number (primary)</span>
					<input
						class="field__input"
						name="utility_account_number"
						type="text"
						value={data.prefill.serviceAccountNumber}
					/>
				</label>
				<label class="field">
					<span class="field__label">Bill property code (Appfolio)</span>
					<input class="field__input" name="bill_property_code" type="text" required />
				</label>
				<label class="field">
					<span class="field__label">Bill unit name (Appfolio)</span>
					<input class="field__input" name="bill_unit_name" type="text" />
				</label>
			</div>
			<label class="field">
				<span class="field__label">Notes</span>
				<textarea class="field__input" name="notes" rows="2"></textarea>
			</label>
			<label class="field field--inline">
				<input type="checkbox" name="active" checked />
				<span>Active</span>
			</label>
			<button class="btn" type="submit">Create unit</button>
		</form>
	</section>

	<section class="units__card">
		<h2 class="units__h2">Existing units</h2>
		<ul class="rows">
			{#if data.units.length === 0}
				<li class="row"><span class="row__muted">No units yet.</span></li>
			{:else}
				{#each data.units as u (u.id)}
					<li class="row">
						<div>
							<div class="row__title">{u.label}{#if !u.active} <span class="row__pill">inactive</span>{/if}</div>
							<div class="row__meta">
								{u.streetAddress ?? '—'}
								{#if u.city}, {u.city}{/if}
								{#if u.state}, {u.state}{/if}
								{#if u.postalCode} {u.postalCode}{/if}
							</div>
							<div class="row__meta">
								Property: <code>{u.billPropertyCode}</code>
								{#if u.billUnitName} · Unit: <code>{u.billUnitName}</code>{/if}
								{#if u.utilityAccountNumber} · Utility acct: <code>{u.utilityAccountNumber}</code>{/if}
								· {u.accountCount} account{u.accountCount === 1 ? '' : 's'}
							</div>
						</div>
						<div class="row__actions">
							{#if showBanner}
								<a class="btn btn--compact btn--primary" href={assignLinkFor(u.id)}>Use this unit</a>
							{:else}
								<a class="btn btn--compact" href={`/tools/units/${u.id}`}>Edit</a>
							{/if}
							<form method="POST" action="?/delete" class="row__form">
								<input type="hidden" name="id" value={u.id} />
								<button
									class="btn btn--compact btn--danger"
									type="submit"
									onclick={(e) => {
										if (!confirm(`Delete unit "${u.label}"? This also removes its utility accounts.`))
											e.preventDefault();
									}}>Delete</button
								>
							</form>
						</div>
					</li>
				{/each}
			{/if}
		</ul>
	</section>
</div>

<style>
	.units { max-width: 56rem; margin: 0 auto; padding: 1.5rem 1.25rem 3rem; }
	.units__title { margin: 0 0 0.35rem; font-size: 1.5rem; font-weight: 700; }
	.units__lead { margin: 0 0 1.25rem; color: color-mix(in srgb, currentColor 72%, transparent); font-size: 0.95rem; }
	.units__err { margin: 0 0 1rem; padding: 0.5rem 0.65rem; border-radius: 10px; background: color-mix(in srgb, #c0392b 12%, transparent); font-size: 0.9rem; white-space: pre-wrap; }
	.units__ok { margin: 0 0 1rem; padding: 0.5rem 0.65rem; border-radius: 10px; background: color-mix(in srgb, #1e8449 14%, transparent); font-size: 0.9rem; }
	.units__banner { margin: 0 0 1rem; padding: 0.6rem 0.75rem; border-radius: 10px; background: color-mix(in srgb, #2980b9 14%, transparent); font-size: 0.9rem; }
	.units__card { margin-bottom: 1.25rem; }
	.units__h2 { margin: 0 0 0.65rem; font-size: 1.05rem; }
	.units__form { display: grid; gap: 0.75rem; max-width: 36rem; }
	.field { display: grid; gap: 0.25rem; }
	.field--inline { display: flex; align-items: center; gap: 0.45rem; }
	.field__label { font-size: 0.82rem; font-weight: 600; }
	.field__input {
		width: 100%;
		box-sizing: border-box;
		font: inherit;
		padding: 0.45rem 0.55rem;
		border-radius: 10px;
		border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
	}
	.field__row {
		display: grid;
		gap: 0.6rem;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
	}
	.btn { appearance: none; display: inline-block; text-decoration: none; font: inherit; padding: 0.45rem 0.85rem; border-radius: 10px; border: 1px solid color-mix(in srgb, currentColor 18%, transparent); background: color-mix(in srgb, currentColor 10%, transparent); color: inherit; cursor: pointer; font-weight: 650; }
	.btn--compact { padding: 0.3rem 0.55rem; font-size: 0.82rem; font-weight: 600; }
	.btn--primary { background: color-mix(in srgb, #2980b9 30%, transparent); }
	.btn--danger { background: color-mix(in srgb, #c0392b 18%, transparent); }
	.rows { list-style: none; margin: 0; padding: 0; border: 1px solid color-mix(in srgb, currentColor 14%, transparent); border-radius: 12px; overflow: hidden; }
	.row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 0.65rem 0.75rem; align-items: center; padding: 0.55rem 0.75rem; border-bottom: 1px solid color-mix(in srgb, currentColor 10%, transparent); font-size: 0.92rem; }
	.row:last-child { border-bottom: none; }
	.row__title { font-weight: 600; overflow-wrap: anywhere; }
	.row__meta { font-size: 0.8rem; color: color-mix(in srgb, currentColor 60%, transparent); }
	.row__actions { display: flex; flex-wrap: wrap; gap: 0.35rem; justify-content: flex-end; }
	.row__form { margin: 0; }
	.row__muted { color: color-mix(in srgb, currentColor 60%, transparent); }
	.row__pill { display: inline-block; margin-left: 0.4rem; padding: 0.05rem 0.4rem; border-radius: 999px; font-size: 0.7rem; font-weight: 600; background: color-mix(in srgb, currentColor 12%, transparent); color: color-mix(in srgb, currentColor 65%, transparent); text-transform: uppercase; letter-spacing: 0.04em; }
	code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.85em; }
</style>
