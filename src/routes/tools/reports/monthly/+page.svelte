<script lang="ts">
	const now = new Date();
	const currentMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

	let lookup = $state(currentMonth);
</script>

<svelte:head>
	<title>Reports · Monthly</title>
</svelte:head>

<section class="monthly">
	<h1 class="monthly__title">Monthly</h1>
	<p class="monthly__lead">
		Period-anchored views: current-month status and historical lookup.
	</p>

	<section class="monthly__panel" aria-label="Current month status">
		<h2 class="monthly__h2">Current month — {currentMonth}</h2>
		<div class="monthly__empty">
			<p>Status panel coming soon.</p>
		</div>
	</section>

	<section class="monthly__panel" aria-label="Historical month lookup">
		<h2 class="monthly__h2">Historical lookup</h2>
		<form class="monthly__form" method="GET" action={`/tools/reports/monthly/${lookup}`}>
			<label class="field">
				<span class="field__label">Month</span>
				<input class="field__input" type="month" bind:value={lookup} required />
			</label>
			<a class="btn" href={`/tools/reports/monthly/${lookup}`}>View month</a>
		</form>
	</section>
</section>

<style>
	.monthly__title { margin: 0 0 0.35rem; font-size: 1.5rem; font-weight: 700; }
	.monthly__lead { margin: 0 0 1.25rem; color: color-mix(in srgb, currentColor 72%, transparent); font-size: 0.95rem; }
	.monthly__panel { margin-bottom: 1.5rem; }
	.monthly__h2 { margin: 0 0 0.65rem; font-size: 1.05rem; }
	.monthly__empty { padding: 1rem 1.25rem; border: 1px dashed color-mix(in srgb, currentColor 22%, transparent); border-radius: 12px; color: color-mix(in srgb, currentColor 65%, transparent); font-size: 0.9rem; }
	.monthly__empty p { margin: 0; }
	.monthly__form { display: grid; gap: 0.75rem; max-width: 20rem; }
	.field { display: grid; gap: 0.25rem; }
	.field__label { font-size: 0.82rem; font-weight: 600; }
	.field__input { font: inherit; padding: 0.45rem 0.55rem; border-radius: 10px; border: 1px solid color-mix(in srgb, currentColor 18%, transparent); }
	.btn { appearance: none; justify-self: start; font: inherit; padding: 0.45rem 0.85rem; border-radius: 10px; border: 1px solid color-mix(in srgb, currentColor 18%, transparent); background: color-mix(in srgb, currentColor 10%, transparent); color: inherit; text-decoration: none; cursor: pointer; font-weight: 650; }
</style>
