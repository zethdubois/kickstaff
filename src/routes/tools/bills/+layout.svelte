<script lang="ts">
	import { page } from '$app/state';

	let { children } = $props();

	const isPostings = $derived(page.url.pathname.startsWith('/tools/bills/postings'));
	const isDocuments = $derived(!isPostings);
</script>

<nav class="billsTabs" aria-label="Bills sections">
	<a
		class="billsTabs__tab"
		href="/tools/bills"
		aria-current={isDocuments ? 'page' : undefined}
	>
		Documents
	</a>
	<span class="billsTabs__sep" aria-hidden="true">|</span>
	<a
		class="billsTabs__tab"
		href="/tools/bills/postings"
		aria-current={isPostings ? 'page' : undefined}
	>
		Postings
	</a>
</nav>

{@render children()}

<style>
	.billsTabs {
		max-width: 56rem;
		margin: 0 auto;
		padding: 0 1.25rem;
		font-size: 0.88rem;
		color: color-mix(in srgb, currentColor 70%, transparent);
	}
	.billsTabs__tab {
		color: inherit;
		text-decoration: underline;
		text-underline-offset: 0.12em;
	}
	.billsTabs__tab[aria-current='page'] {
		font-weight: 700;
		color: color-mix(in srgb, currentColor 90%, transparent);
		text-decoration: none;
	}
	.billsTabs__sep {
		margin: 0 0.5rem;
	}
</style>
