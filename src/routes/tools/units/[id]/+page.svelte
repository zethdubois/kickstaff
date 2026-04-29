<!--
  @docs-order
  1) /home/golem/projects/publicweb/AGENTS.md
  2) /home/golem/projects/publicweb/docs/guides/tools-architecture.md
  3) /home/golem/projects/publicweb/docs/guides/tools-ui-map.md
-->
<!--
  @docs: docs/sop-svelte-and-components.md
-->
<script lang="ts">
	let { data, form } = $props();

	let editingAccountId = $state<string | null>(null);
</script>

<svelte:head>
	<title>Unit · {data.unit.label}</title>
</svelte:head>

<div class="unit">
	<a class="unit__back" href="/tools/units">&larr; All units</a>
	<h1 class="unit__title">{data.unit.label}</h1>

	{#if form?.message}
		<p class="unit__err" role="alert">{form.message}</p>
	{/if}
	{#if form?.unitUpdated}
		<p class="unit__ok" role="status">Unit updated.</p>
	{/if}
	{#if form?.accountAdded}
		<p class="unit__ok" role="status">Added account {form.serviceAccountNumber}.</p>
	{/if}
	{#if form?.accountUpdated}
		<p class="unit__ok" role="status">Account updated.</p>
	{/if}
	{#if form?.accountDeleted}
		<p class="unit__ok" role="status">Account removed.</p>
	{/if}

	<section class="unit__card">
		<h2 class="unit__h2">Unit details</h2>
		<form method="POST" action="?/updateUnit" class="unit__form">
			<label class="field">
				<span class="field__label">Label</span>
				<input class="field__input" name="label" type="text" value={data.unit.label} required />
			</label>
			<label class="field">
				<span class="field__label">Street address</span>
				<input class="field__input" name="street_address" type="text" value={data.unit.streetAddress ?? ''} />
			</label>
			<div class="field__row">
				<label class="field">
					<span class="field__label">City</span>
					<input class="field__input" name="city" type="text" value={data.unit.city ?? ''} />
				</label>
				<label class="field">
					<span class="field__label">State</span>
					<input class="field__input" name="state" type="text" value={data.unit.state ?? ''} />
				</label>
				<label class="field">
					<span class="field__label">Postal code</span>
					<input class="field__input" name="postal_code" type="text" value={data.unit.postalCode ?? ''} />
				</label>
			</div>
			<div class="field__row">
				<label class="field">
					<span class="field__label">Utility account number (primary)</span>
					<input
						class="field__input"
						name="utility_account_number"
						type="text"
						value={data.unit.utilityAccountNumber ?? data.prefill.serviceAccountNumber}
					/>
				</label>
				<label class="field">
					<span class="field__label">Bill property code (Appfolio)</span>
					<input class="field__input" name="bill_property_code" type="text" value={data.unit.billPropertyCode} required />
				</label>
				<label class="field">
					<span class="field__label">Bill unit name (Appfolio)</span>
					<input class="field__input" name="bill_unit_name" type="text" value={data.unit.billUnitName ?? ''} />
				</label>
			</div>
			<label class="field">
				<span class="field__label">Notes</span>
				<textarea class="field__input" name="notes" rows="2">{data.unit.notes ?? ''}</textarea>
			</label>
			<label class="field field--inline">
				<input type="checkbox" name="active" checked={data.unit.active} />
				<span>Active</span>
			</label>
			<button class="btn" type="submit">Save unit</button>
		</form>
	</section>

	<section class="unit__card">
		<h2 class="unit__h2">Bill accounts</h2>
		<p class="unit__sub">Vendor accounts (utility, insurance, taxes, …) that bill this unit. Cross-referenced by (vendor, account number) when generating monthly batch CSVs.</p>

		<details class="unit__addAccount" open={data.prefill.serviceAccountNumber !== '' || data.accounts.length === 0}>
			<summary>Add account</summary>
			<form method="POST" action="?/addAccount" class="unit__form">
				<div class="field__row">
					<label class="field">
						<span class="field__label">Category</span>
						<select class="field__input" name="category">
							{#each data.categories as c (c)}
								<option value={c} selected={c === (data.prefill.category || 'utility')}>{c}</option>
							{/each}
						</select>
					</label>
					<label class="field">
						<span class="field__label">Vendor</span>
						<input class="field__input" name="vendor" type="text" value={data.prefill.vendor || 'city-of-moscow'} required />
					</label>
					<label class="field">
						<span class="field__label">City</span>
						<input class="field__input" name="city" type="text" value={data.prefill.city || data.unit.city || 'mos'} required />
					</label>
				</div>
				<label class="field">
					<span class="field__label">Service account number</span>
					<input class="field__input" name="service_account_number" type="text" value={data.prefill.serviceAccountNumber} required />
				</label>
				<label class="field">
					<span class="field__label">Service address (normalized, optional)</span>
					<input class="field__input" name="service_address_normalized" type="text" />
				</label>
				<div class="field__row">
					<label class="field">
						<span class="field__label">Vendor payee name</span>
						<input class="field__input" name="vendor_payee_name" type="text" required />
					</label>
					<label class="field">
						<span class="field__label">Bill account (Appfolio GL)</span>
						<input class="field__input" name="bill_account" type="text" required />
					</label>
				</div>
				<label class="field">
					<span class="field__label">Description template (optional)</span>
					<input
						class="field__input"
						name="default_description_template"
						type="text"
						placeholder="{'{vendor} utility bill {servicePeriodStart} to {servicePeriodEnd}'}"
					/>
				</label>
				<label class="field">
					<span class="field__label">Cash account (optional)</span>
					<input class="field__input" name="cash_account" type="text" />
				</label>
				<label class="field field--inline">
					<input type="checkbox" name="active" checked />
					<span>Active</span>
				</label>
				<button class="btn" type="submit">Add account</button>
			</form>
		</details>

		<ul class="rows">
			{#if data.accounts.length === 0}
				<li class="row"><span class="row__muted">No accounts linked yet.</span></li>
			{:else}
				{#each data.accounts as a (a.id)}
					<li class="row">
						{#if editingAccountId === a.id}
							<form method="POST" action="?/updateAccount" class="unit__form unit__form--edit">
								<input type="hidden" name="account_id" value={a.id} />
								<div class="field__row">
									<label class="field">
										<span class="field__label">Category</span>
										<select class="field__input" name="category">
											{#each data.categories as c (c)}
												<option value={c} selected={c === a.category}>{c}</option>
											{/each}
										</select>
									</label>
									<label class="field">
										<span class="field__label">Vendor</span>
										<input class="field__input" name="vendor" type="text" value={a.vendor} required />
									</label>
									<label class="field">
										<span class="field__label">City</span>
										<input class="field__input" name="city" type="text" value={a.city} required />
									</label>
								</div>
								<label class="field">
									<span class="field__label">Service account number</span>
									<input class="field__input" name="service_account_number" type="text" value={a.serviceAccountNumber} required />
								</label>
								<label class="field">
									<span class="field__label">Service address (normalized)</span>
									<input class="field__input" name="service_address_normalized" type="text" value={a.serviceAddressNormalized ?? ''} />
								</label>
								<div class="field__row">
									<label class="field">
										<span class="field__label">Vendor payee name</span>
										<input class="field__input" name="vendor_payee_name" type="text" value={a.vendorPayeeName} required />
									</label>
									<label class="field">
										<span class="field__label">Bill account (Appfolio GL)</span>
										<input class="field__input" name="bill_account" type="text" value={a.billAccount} required />
									</label>
								</div>
								<label class="field">
									<span class="field__label">Description template</span>
									<input class="field__input" name="default_description_template" type="text" value={a.defaultDescriptionTemplate ?? ''} />
								</label>
								<label class="field">
									<span class="field__label">Cash account</span>
									<input class="field__input" name="cash_account" type="text" value={a.cashAccount ?? ''} />
								</label>
								<label class="field field--inline">
									<input type="checkbox" name="active" checked={a.active} />
									<span>Active</span>
								</label>
								<div class="row__actions">
									<button class="btn btn--compact" type="submit">Save</button>
									<button class="btn btn--compact" type="button" onclick={() => (editingAccountId = null)}>Cancel</button>
								</div>
							</form>
						{:else}
							<div>
								<div class="row__title">
									<span class="row__pill row__pill--cat">{a.category}</span>
									{a.vendor} · <code>{a.serviceAccountNumber}</code>
									{#if !a.active} <span class="row__pill">inactive</span>{/if}
								</div>
								<div class="row__meta">
									Payee: {a.vendorPayeeName} · GL: <code>{a.billAccount}</code>
									{#if a.cashAccount} · Cash: <code>{a.cashAccount}</code>{/if}
								</div>
								{#if a.serviceAddressNormalized}
									<div class="row__meta">{a.serviceAddressNormalized}</div>
								{/if}
								{#if a.defaultDescriptionTemplate}
									<div class="row__meta row__meta--mono">{a.defaultDescriptionTemplate}</div>
								{/if}
							</div>
							<div class="row__actions">
								<button class="btn btn--compact" type="button" onclick={() => (editingAccountId = a.id)}>Edit</button>
								<form method="POST" action="?/deleteAccount" class="row__form">
									<input type="hidden" name="account_id" value={a.id} />
									<button
										class="btn btn--compact btn--danger"
										type="submit"
										onclick={(e) => {
											if (!confirm(`Remove account ${a.serviceAccountNumber}?`)) e.preventDefault();
										}}>Remove</button
									>
								</form>
							</div>
						{/if}
					</li>
				{/each}
			{/if}
		</ul>
	</section>
</div>

<style>
	.unit { max-width: 56rem; margin: 0 auto; padding: 1.5rem 1.25rem 3rem; }
	.unit__back { display: inline-block; margin-bottom: 0.5rem; font-size: 0.85rem; color: color-mix(in srgb, currentColor 70%, transparent); text-decoration: underline; text-underline-offset: 0.12em; }
	.unit__title { margin: 0 0 1rem; font-size: 1.5rem; font-weight: 700; }
	.unit__err { margin: 0 0 1rem; padding: 0.5rem 0.65rem; border-radius: 10px; background: color-mix(in srgb, #c0392b 12%, transparent); font-size: 0.9rem; white-space: pre-wrap; }
	.unit__ok { margin: 0 0 1rem; padding: 0.5rem 0.65rem; border-radius: 10px; background: color-mix(in srgb, #1e8449 14%, transparent); font-size: 0.9rem; }
	.unit__card { margin-bottom: 1.5rem; }
	.unit__h2 { margin: 0 0 0.5rem; font-size: 1.05rem; }
	.unit__sub { margin: 0 0 0.75rem; font-size: 0.85rem; color: color-mix(in srgb, currentColor 65%, transparent); }
	.unit__form { display: grid; gap: 0.75rem; max-width: 36rem; }
	.unit__form--edit { max-width: 100%; }
	.unit__addAccount { margin-bottom: 0.75rem; padding: 0.65rem 0.85rem; border: 1px dashed color-mix(in srgb, currentColor 22%, transparent); border-radius: 12px; }
	.unit__addAccount summary { cursor: pointer; font-weight: 650; }
	.unit__addAccount[open] summary { margin-bottom: 0.75rem; }
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
	.btn--danger { background: color-mix(in srgb, #c0392b 18%, transparent); }
	.rows { list-style: none; margin: 0; padding: 0; border: 1px solid color-mix(in srgb, currentColor 14%, transparent); border-radius: 12px; overflow: hidden; }
	.row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 0.65rem 0.75rem; align-items: start; padding: 0.55rem 0.75rem; border-bottom: 1px solid color-mix(in srgb, currentColor 10%, transparent); font-size: 0.92rem; }
	.row:last-child { border-bottom: none; }
	.row__title { font-weight: 600; overflow-wrap: anywhere; }
	.row__meta { font-size: 0.8rem; color: color-mix(in srgb, currentColor 60%, transparent); }
	.row__meta--mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
	.row__actions { display: flex; flex-wrap: wrap; gap: 0.35rem; justify-content: flex-end; }
	.row__form { margin: 0; }
	.row__muted { color: color-mix(in srgb, currentColor 60%, transparent); }
	.row__pill { display: inline-block; margin-left: 0.4rem; padding: 0.05rem 0.4rem; border-radius: 999px; font-size: 0.7rem; font-weight: 600; background: color-mix(in srgb, currentColor 12%, transparent); color: color-mix(in srgb, currentColor 65%, transparent); text-transform: uppercase; letter-spacing: 0.04em; }
	.row__pill--cat { margin-left: 0; margin-right: 0.4rem; background: color-mix(in srgb, #2980b9 22%, transparent); color: color-mix(in srgb, currentColor 85%, transparent); }
	code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.85em; }
</style>
