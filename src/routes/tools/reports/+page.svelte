<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	let confirmText = $state('');
</script>

<svelte:head>
	<title>Reports · Operations</title>
</svelte:head>

<section class="ops">
	<h1 class="ops__title">Operations</h1>
	<p class="ops__lead">
		Ad-hoc maintenance operations you can run on demand. These do not run on a schedule.
	</p>

	{#if form?.message}
		<div class="ops__alert ops__alert--err" role="alert">{form.message}</div>
	{:else if form?.ok && form.op === 'resetVendor'}
		<div class="ops__alert ops__alert--ok" role="status">
			Re-parse queued for <strong>{form.vendor}</strong>: reset {form.updatedCount} document(s) back to <code>received</code>.
		</div>
	{:else if form?.ok && form.op === 'resetAll'}
		<div class="ops__alert ops__alert--ok" role="status">
			Re-parse queued for ALL vendors: reset {form.updatedCount} document(s) back to <code>received</code>.
		</div>
	{/if}

	<article class="op">
		<header class="op__head">
			<h2 class="op__title">Re-parse a vendor's bills</h2>
			<p class="op__desc">
				Resets every <code>parsed</code> document for the chosen vendor back to <code>received</code> so the parser will run again on the next pass. Safe to repeat. Failed and skipped documents are left alone.
			</p>
		</header>
		{#if data.vendors.length === 0}
			<p class="op__empty">No vendors with parsed documents yet.</p>
		{:else}
			<form class="op__form" method="POST" action="?/resetVendor" use:enhance>
				<label class="field">
					<span class="field__label">Vendor</span>
					<select class="field__input" name="vendor" required>
						{#each data.vendors as v (v.vendor)}
							<option value={v.vendor}>{v.vendor} ({v.parsedCount} parsed)</option>
						{/each}
					</select>
				</label>
				<button class="btn" type="submit">Re-parse vendor</button>
			</form>
		{/if}
	</article>

	<article class="op op--danger">
		<header class="op__head">
			<h2 class="op__title">Re-parse ALL vendors</h2>
			<p class="op__desc">
				Resets every <code>parsed</code> document across all vendors ({data.totalParsed} total). Use sparingly. Type <code>RESET ALL</code> to confirm.
			</p>
		</header>
		<form class="op__form" method="POST" action="?/resetAll" use:enhance>
			<label class="field">
				<span class="field__label">Confirm</span>
				<input
					class="field__input"
					type="text"
					name="confirm"
					placeholder="RESET ALL"
					autocomplete="off"
					bind:value={confirmText}
					required
				/>
			</label>
			<button class="btn btn--danger" type="submit" disabled={confirmText !== 'RESET ALL'}>
				Re-parse all vendors
			</button>
		</form>
	</article>
</section>

<style>
	.ops__title { margin: 0 0 0.35rem; font-size: 1.5rem; font-weight: 700; }
	.ops__lead { margin: 0 0 1.25rem; color: color-mix(in srgb, currentColor 72%, transparent); font-size: 0.95rem; }
	.ops__alert { padding: 0.7rem 0.85rem; border-radius: 10px; margin-bottom: 1rem; font-size: 0.9rem; }
	.ops__alert--ok { background: color-mix(in srgb, mediumseagreen 16%, transparent); border: 1px solid color-mix(in srgb, mediumseagreen 32%, transparent); }
	.ops__alert--err { background: color-mix(in srgb, tomato 14%, transparent); border: 1px solid color-mix(in srgb, tomato 32%, transparent); }
	.op { padding: 1rem 1.1rem; border: 1px solid color-mix(in srgb, currentColor 14%, transparent); border-radius: 14px; margin-bottom: 1rem; background: color-mix(in srgb, currentColor 2%, transparent); }
	.op--danger { border-color: color-mix(in srgb, tomato 32%, transparent); background: color-mix(in srgb, tomato 4%, transparent); }
	.op__head { margin-bottom: 0.75rem; }
	.op__title { margin: 0 0 0.25rem; font-size: 1.05rem; font-weight: 650; }
	.op__desc { margin: 0; font-size: 0.88rem; color: color-mix(in srgb, currentColor 75%, transparent); line-height: 1.4; }
	.op__empty { margin: 0; font-size: 0.9rem; color: color-mix(in srgb, currentColor 65%, transparent); }
	.op__form { display: grid; gap: 0.75rem; max-width: 24rem; margin-top: 0.5rem; }
	.field { display: grid; gap: 0.25rem; }
	.field__label { font-size: 0.82rem; font-weight: 600; }
	.field__input { font: inherit; padding: 0.45rem 0.55rem; border-radius: 10px; border: 1px solid color-mix(in srgb, currentColor 18%, transparent); }
	.btn { appearance: none; justify-self: start; font: inherit; padding: 0.45rem 0.85rem; border-radius: 10px; border: 1px solid color-mix(in srgb, currentColor 18%, transparent); background: color-mix(in srgb, currentColor 10%, transparent); color: inherit; cursor: pointer; font-weight: 650; }
	.btn--danger { background: color-mix(in srgb, tomato 18%, transparent); border-color: color-mix(in srgb, tomato 38%, transparent); }
	.btn:disabled { opacity: 0.5; cursor: not-allowed; }
	code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.85em; padding: 0.05rem 0.3rem; border-radius: 4px; background: color-mix(in srgb, currentColor 8%, transparent); }
</style>
