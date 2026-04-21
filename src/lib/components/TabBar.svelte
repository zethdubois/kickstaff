<script lang="ts">
	import { page } from '$app/state';

	type TabItem = { label: string; href: string; match?: (path: string) => boolean };

	let {
		tabs,
		variant = 'primary',
		ariaLabel
	}: {
		tabs: TabItem[];
		variant?: 'primary' | 'secondary';
		ariaLabel: string;
	} = $props();

	function isActive(t: TabItem, path: string): boolean {
		if (t.match) return t.match(path);
		return path === t.href || path.startsWith(t.href + '/');
	}
</script>

<nav class="tabs tabs--{variant}" aria-label={ariaLabel}>
	<ul class="tabs__list">
		{#each tabs as t (t.href)}
			{@const active = isActive(t, page.url.pathname)}
			<li class="tabs__item">
				<a
					class="tabs__tab"
					class:tabs__tab--active={active}
					href={t.href}
					aria-current={active ? 'page' : undefined}
				>
					{t.label}
				</a>
			</li>
		{/each}
	</ul>
</nav>

<style>
	.tabs {
		display: block;
	}
	.tabs__list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		gap: 0.25rem;
		flex-wrap: wrap;
	}
	.tabs__tab {
		display: inline-block;
		font: inherit;
		color: color-mix(in srgb, currentColor 65%, transparent);
		text-decoration: none;
		font-weight: 600;
		cursor: pointer;
	}

	/* Primary: anchored to the top of a card. Active tab merges visually with the card below. */
	.tabs--primary {
		padding: 0 0.4rem;
	}
	.tabs--primary .tabs__list {
		gap: 0.15rem;
	}
	.tabs--primary .tabs__tab {
		padding: 0.7rem 1.1rem;
		font-size: 0.95rem;
		border: 1px solid transparent;
		border-bottom: none;
		border-top-left-radius: 12px;
		border-top-right-radius: 12px;
		background: color-mix(in srgb, currentColor 4%, transparent);
		position: relative;
		top: 1px;
	}
	.tabs--primary .tabs__tab:hover {
		color: color-mix(in srgb, currentColor 88%, transparent);
		background: color-mix(in srgb, currentColor 7%, transparent);
	}
	.tabs--primary .tabs__tab--active {
		color: inherit;
		font-weight: 700;
		background: var(--panel-card-bg, color-mix(in srgb, Canvas 95%, transparent));
		border-color: color-mix(in srgb, currentColor 14%, transparent);
		border-bottom-color: transparent;
		z-index: 1;
	}

	/* Secondary: lives inside a card, smaller, underline-on-active. */
	.tabs--secondary {
		border-bottom: 1px solid color-mix(in srgb, currentColor 12%, transparent);
		margin-bottom: 1.25rem;
	}
	.tabs--secondary .tabs__list {
		gap: 0.5rem;
	}
	.tabs--secondary .tabs__tab {
		padding: 0.55rem 0.85rem;
		font-size: 0.88rem;
		border-bottom: 2px solid transparent;
		margin-bottom: -1px;
	}
	.tabs--secondary .tabs__tab:hover {
		color: color-mix(in srgb, currentColor 88%, transparent);
	}
	.tabs--secondary .tabs__tab--active {
		color: inherit;
		font-weight: 700;
		border-bottom-color: currentColor;
	}
</style>
