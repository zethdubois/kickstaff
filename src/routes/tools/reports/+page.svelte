<svelte:head>
	<title>Reports · Operations</title>
</svelte:head>

<section class="reports">
	<h1 class="reports__title">Operations</h1>
	<p class="reports__lead">
		Ad-hoc report and export operations you can run on demand.
	</p>
	<div class="reports__empty">
		<p>No operations available yet — coming soon.</p>
	</div>
</section>

<style>
	.reports { }
	.reports__title { margin: 0 0 0.35rem; font-size: 1.5rem; font-weight: 700; }
	.reports__lead { margin: 0 0 1.25rem; color: color-mix(in srgb, currentColor 72%, transparent); font-size: 0.95rem; }
	.reports__empty { padding: 1rem 1.25rem; border: 1px dashed color-mix(in srgb, currentColor 22%, transparent); border-radius: 12px; color: color-mix(in srgb, currentColor 65%, transparent); font-size: 0.9rem; }
	.reports__empty p { margin: 0; }
</style>
