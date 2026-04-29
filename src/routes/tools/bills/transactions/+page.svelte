<!--
  @docs-order
  1) /home/golem/projects/publicweb/AGENTS.md
  2) /home/golem/projects/publicweb/docs/guides/tools-bills-architecture.md
  3) /home/golem/projects/publicweb/docs/guides/tools-bills-ui-map.md
-->
<!--
  @docs: docs/sop-svelte-and-components.md
-->
<!--
  @docs-order
  1) /home/golem/projects/publicweb/AGENTS.md
  2) /home/golem/projects/publicweb/docs/guides/tools-bills-architecture.md
  3) /home/golem/projects/publicweb/docs/guides/tools-bills-ui-map.md
-->
<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>Transactions</title>
</svelte:head>

<div class="txn">
	<h1 class="txn__title">Transactions</h1>
	<p class="txn__lead">Filter and review transaction candidates before posting workflows.</p>

	<section class="txn__card">
		<form class="txn__form" method="GET">
			<details class="filters" open>
				<summary>Filters</summary>

				<fieldset class="filterGroup">
					<legend>Vendor (AND checklist)</legend>
					<p class="filterHint">All checked vendors are treated as required matches.</p>

					{#each data.vendorAndOptions as vendor (vendor)}
						<label class="check">
							<input type="checkbox" name="vendor_and" value={vendor} />
							<span>{vendor}</span>
						</label>
					{/each}
				</fieldset>
			</details>

			<div class="txn__actions">
				<button class="btn" type="submit">Apply filters</button>
			</div>
		</form>
	</section>
</div>

<style>
	.txn {
		max-width: 56rem;
		margin: 0 auto;
		padding: 1.5rem 1.25rem 3rem;
	}
	.txn__title {
		margin: 0 0 0.35rem;
		font-size: 1.5rem;
		font-weight: 700;
	}
	.txn__lead {
		margin: 0 0 1rem;
		color: color-mix(in srgb, currentColor 72%, transparent);
		font-size: 0.95rem;
	}
	.txn__card {
		border: 1px solid color-mix(in srgb, currentColor 14%, transparent);
		border-radius: 12px;
		padding: 0.9rem;
	}
	.filters > summary {
		cursor: pointer;
		font-weight: 650;
	}
	.filterGroup {
		margin: 0.75rem 0 0;
		border: 1px solid color-mix(in srgb, currentColor 14%, transparent);
		border-radius: 10px;
		padding: 0.7rem 0.8rem 0.75rem;
	}
	.filterHint {
		margin: 0 0 0.55rem;
		font-size: 0.82rem;
		color: color-mix(in srgb, currentColor 62%, transparent);
	}
	.check {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0.35rem 0;
	}
	.txn__actions {
		margin-top: 0.8rem;
	}
	.btn {
		appearance: none;
		font: inherit;
		padding: 0.45rem 0.85rem;
		border-radius: 10px;
		border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
		background: color-mix(in srgb, currentColor 10%, transparent);
		cursor: pointer;
		font-weight: 650;
	}
</style>
