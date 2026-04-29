<!--
  @docs-order
  1) /home/golem/projects/publicweb/AGENTS.md
  2) /home/golem/projects/publicweb/docs/guides/tools-architecture.md
  3) /home/golem/projects/publicweb/docs/guides/tools-ui-map.md
-->
<script lang="ts">
	import MonthlyMetricsView from '$lib/components/MonthlyMetricsView.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>Reports · Monthly · {data.period}</title>
</svelte:head>

<section class="month">
	<a class="month__back" href="/tools/reports/monthly">&larr; Monthly</a>
	<h1 class="month__title">Monthly · {data.period}</h1>
	<MonthlyMetricsView metrics={data.metrics} />
</section>

<style>
	.month__back { display: inline-block; margin-bottom: 0.5rem; font-size: 0.85rem; color: color-mix(in srgb, currentColor 70%, transparent); text-decoration: underline; text-underline-offset: 0.12em; }
	.month__title { margin: 0 0 1rem; font-size: 1.5rem; font-weight: 700; }
</style>
