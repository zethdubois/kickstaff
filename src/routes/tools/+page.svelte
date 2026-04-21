<!--
  @docs: docs/sop-svelte-and-components.md
-->
<svelte:head>
	<title>Tools</title>
</svelte:head>

<div class="toolsPage">
	<h1 class="toolsPage__title">Tools</h1>
	<p class="toolsPage__lead">Operational tools for internal workflows.</p>

	<section class="toolsPage__list" aria-label="Available tools">
		<a class="toolCard" href="/tools/utility-bills">
			<h2 class="toolCard__title">Utility bills</h2>
			<p class="toolCard__desc">Upload and parse utility bill PDFs for batch export workflows.</p>
		</a>
	</section>
</div>

<style>
	.toolsPage {
		max-width: 40rem;
		margin: 0 auto;
		padding: 1.5rem 1.25rem 3rem;
	}

	.toolsPage__title {
		margin: 0 0 0.35rem;
		font-size: 1.5rem;
		font-weight: 700;
	}

	.toolsPage__lead {
		margin: 0 0 1.25rem;
		color: color-mix(in srgb, currentColor 72%, transparent);
		font-size: 0.95rem;
	}

	.toolsPage__list {
		display: grid;
		gap: 0.75rem;
	}

	.toolCard {
		display: block;
		padding: 0.85rem 1rem;
		border-radius: 12px;
		border: 1px solid color-mix(in srgb, currentColor 16%, transparent);
		background: color-mix(in srgb, currentColor 3%, transparent);
		text-decoration: none;
		color: inherit;
	}

	.toolCard:hover {
		background: color-mix(in srgb, currentColor 7%, transparent);
	}

	.toolCard__title {
		margin: 0 0 0.2rem;
		font-size: 1rem;
		font-weight: 650;
	}

	.toolCard__desc {
		margin: 0;
		font-size: 0.9rem;
		color: color-mix(in srgb, currentColor 72%, transparent);
	}
</style>
