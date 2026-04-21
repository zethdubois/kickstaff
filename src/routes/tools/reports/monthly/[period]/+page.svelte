<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>Reports · Monthly · {data.period}</title>
</svelte:head>

<section class="month">
	<a class="month__back" href="/tools/reports/monthly">&larr; Monthly</a>
	<h1 class="month__title">Monthly · {data.period}</h1>
	<div class="month__empty">
		<p>Historical month report coming soon.</p>
	</div>
</section>

<style>
	.month__back { display: inline-block; margin-bottom: 0.5rem; font-size: 0.85rem; color: color-mix(in srgb, currentColor 70%, transparent); text-decoration: underline; text-underline-offset: 0.12em; }
	.month__title { margin: 0 0 1rem; font-size: 1.5rem; font-weight: 700; }
	.month__empty { padding: 1rem 1.25rem; border: 1px dashed color-mix(in srgb, currentColor 22%, transparent); border-radius: 12px; color: color-mix(in srgb, currentColor 65%, transparent); font-size: 0.9rem; }
	.month__empty p { margin: 0; }
</style>
