<script lang="ts">
	import type { MonthlyMetrics } from '$lib/server/bills/monthlyMetrics';

	let { metrics }: { metrics: MonthlyMetrics } = $props();
</script>

<div class="metrics">
	<section class="metrics__group" aria-label="Documents">
		<h3 class="metrics__h3">Documents (uploaded this period)</h3>
		<dl class="metrics__grid">
			<div class="metric"><dt>Total</dt><dd>{metrics.documents.total}</dd></div>
			<div class="metric"><dt>Parsed</dt><dd>{metrics.documents.parsed}</dd></div>
			<div class="metric metric--warn"><dt>Failed</dt><dd>{metrics.documents.failed}</dd></div>
			<div class="metric"><dt>Received (unparsed)</dt><dd>{metrics.documents.received}</dd></div>
			<div class="metric"><dt>Skipped</dt><dd>{metrics.documents.skipped}</dd></div>
		</dl>
	</section>

	<section class="metrics__group" aria-label="Postings">
		<h3 class="metrics__h3">Postings (batches for this period)</h3>
		<dl class="metrics__grid">
			<div class="metric"><dt>Batches</dt><dd>{metrics.postings.total}</dd></div>
			<div class="metric"><dt>Pending</dt><dd>{metrics.postings.pending}</dd></div>
			<div class="metric"><dt>Processing</dt><dd>{metrics.postings.processing}</dd></div>
			<div class="metric metric--good"><dt>Done</dt><dd>{metrics.postings.done}</dd></div>
			<div class="metric"><dt>Records (total)</dt><dd>{metrics.postings.recordsTotal}</dd></div>
		</dl>
	</section>
</div>

<style>
	.metrics { display: grid; gap: 1.25rem; }
	.metrics__h3 { margin: 0 0 0.5rem; font-size: 1rem; font-weight: 650; }
	.metrics__grid {
		margin: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
		gap: 0.6rem;
	}
	.metric {
		padding: 0.7rem 0.85rem;
		border: 1px solid color-mix(in srgb, currentColor 14%, transparent);
		border-radius: 12px;
		background: color-mix(in srgb, currentColor 2%, transparent);
		display: grid;
		gap: 0.15rem;
	}
	.metric dt { margin: 0; font-size: 0.78rem; color: color-mix(in srgb, currentColor 65%, transparent); }
	.metric dd { margin: 0; font-size: 1.4rem; font-weight: 700; }
	.metric--good { background: color-mix(in srgb, mediumseagreen 14%, transparent); border-color: color-mix(in srgb, mediumseagreen 32%, transparent); }
	.metric--warn { background: color-mix(in srgb, tomato 12%, transparent); border-color: color-mix(in srgb, tomato 30%, transparent); }
</style>
