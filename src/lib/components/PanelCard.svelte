<script lang="ts">
	let { children } = $props();
</script>

<div class="panelCard">
	<div class="panelCard__inner">
		{@render children()}
	</div>
</div>

<style>
	.panelCard {
		--panel-card-bg: color-mix(in srgb, Canvas 95%, transparent);
		background: var(--panel-card-bg);
		border: 1px solid color-mix(in srgb, currentColor 14%, transparent);
		border-radius: 14px;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04), 0 8px 24px rgba(0, 0, 0, 0.06);
		overflow: hidden;
	}
	.panelCard__inner {
		padding: 2rem 2rem 2.25rem;
	}
	@media (max-width: 640px) {
		.panelCard__inner {
			padding: 1.25rem 1.1rem 1.5rem;
		}
	}
</style>
