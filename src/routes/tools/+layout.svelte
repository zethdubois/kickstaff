<script lang="ts">
	import { page } from '$app/state';

	let { children } = $props();
</script>

<svelte:head>
	<title>Tools</title>
</svelte:head>

<div class="toolsLayout">
	<nav class="toolsLayout__tabs" aria-label="Tools">
		<a
			class="toolsLayout__tab"
			href="/tools/bills"
			aria-current={page.url.pathname.startsWith('/tools/bills') ? 'page' : undefined}
		>
			Bills
		</a>
		<span class="toolsLayout__sep" aria-hidden="true">|</span>
		<a
			class="toolsLayout__tab"
			href="/tools/bill-runs"
			aria-current={page.url.pathname.startsWith('/tools/bill-runs') ? 'page' : undefined}
		>
			Bill runs
		</a>
		<span class="toolsLayout__sep" aria-hidden="true">|</span>
		<a
			class="toolsLayout__tab"
			href="/tools/units"
			aria-current={page.url.pathname.startsWith('/tools/units') ? 'page' : undefined}
		>
			Units
		</a>
	</nav>

	{@render children()}
</div>

<style>
	.toolsLayout {
		max-width: 56rem;
		margin: 0 auto;
		padding: 1.5rem 1.25rem 3rem;
	}

	.toolsLayout__tabs {
		margin-bottom: 1rem;
		font-size: 0.9rem;
		color: color-mix(in srgb, currentColor 72%, transparent);
	}

	.toolsLayout__tab {
		color: inherit;
		text-decoration: underline;
		text-underline-offset: 0.12em;
	}

	.toolsLayout__tab[aria-current='page'] {
		font-weight: 700;
		color: color-mix(in srgb, currentColor 90%, transparent);
		text-decoration: none;
	}

	.toolsLayout__sep {
		margin: 0 0.5rem;
	}
</style>
