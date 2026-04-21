<script lang="ts">
	import { page } from '$app/state';

	let { children } = $props();

	const isMonthly = $derived(page.url.pathname.startsWith('/tools/reports/monthly'));
	const isOperations = $derived(!isMonthly);
</script>

<nav class="reportsTabs" aria-label="Reports sections">
	<a
		class="reportsTabs__tab"
		href="/tools/reports"
		aria-current={isOperations ? 'page' : undefined}
	>
		Operations
	</a>
	<span class="reportsTabs__sep" aria-hidden="true">|</span>
	<a
		class="reportsTabs__tab"
		href="/tools/reports/monthly"
		aria-current={isMonthly ? 'page' : undefined}
	>
		Monthly
	</a>
</nav>

{@render children()}

<style>
	.reportsTabs {
		margin-bottom: 1rem;
		font-size: 0.88rem;
		color: color-mix(in srgb, currentColor 70%, transparent);
	}
	.reportsTabs__tab {
		color: inherit;
		text-decoration: underline;
		text-underline-offset: 0.12em;
	}
	.reportsTabs__tab[aria-current='page'] {
		font-weight: 700;
		color: color-mix(in srgb, currentColor 90%, transparent);
		text-decoration: none;
	}
	.reportsTabs__sep {
		margin: 0 0.5rem;
	}
</style>
