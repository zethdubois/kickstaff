<script lang="ts">
	const resources = [
		{
			title: 'AppFolio',
			description: 'Property management system (ops access).',
			href: 'https://kickasset.appfolio.com/'
		},
		{
			title: 'Kickass Office Notes',
			description: 'Google Sheet: office notes + tech stack notes.',
			href: 'https://docs.google.com/spreadsheets/d/1eF6Imoj7fl2hrvIJVq_qeMBOHWr-Ur1k7zCHgJPZxqA/edit?usp=sharing'
		},
		{
			title: 'Property Expenses',
			description: 'Google Sheet: property expense category map.',
			href: 'https://docs.google.com/spreadsheets/d/1r3LntyoKA1efd7ijw4C7e7tkjkEDZ6Pa/edit?usp=sharing&ouid=109307632736242833065&rtpof=true&sd=true'
		}
	] as const;
</script>

<svelte:head>
	<title>Kickass Ops</title>
</svelte:head>

<div class="dash">
	<header class="dash__header">
		<h1 class="dash__title">Internal Ops Dashboard</h1>
		<p class="dash__subtitle">Quick links for day-to-day operations (auth will be added later).</p>
	</header>

	<section class="dash__section" aria-label="Resources">
		<div class="cards">
			{#each resources as item (item.href)}
				<a class="card" href={item.href} target="_blank" rel="noreferrer">
					<div class="card__title">{item.title}</div>
					<div class="card__desc">{item.description}</div>
					<div class="card__meta">Open in new tab</div>
				</a>
			{/each}
		</div>
	</section>

	<section class="dash__section" aria-label="Status">
		<div class="notice" role="note">
			<div class="notice__title">Dummy login mode</div>
			<p class="notice__body">
				This dashboard is currently protected by a temporary cookie set by the “LOGIN” OK button. Real
				authentication/roles will be built later.
			</p>
		</div>
	</section>
</div>

<style>
	.dash__header {
		margin-bottom: 1.25rem;
	}

	.dash__title {
		margin: 0 0 0.35rem;
		font-size: 1.75rem;
		font-weight: 700;
		letter-spacing: -0.02em;
	}

	.dash__subtitle {
		margin: 0;
		color: color-mix(in srgb, currentColor 70%, transparent);
	}

	.dash__section + .dash__section {
		margin-top: 1.25rem;
	}

	.cards {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
		gap: 0.9rem;
	}

	.card {
		display: block;
		padding: 1rem;
		border-radius: 12px;
		border: 1px solid color-mix(in srgb, currentColor 14%, transparent);
		background: color-mix(in srgb, currentColor 3%, transparent);
		color: inherit;
		text-decoration: none;
		transition:
			transform 120ms ease,
			border-color 120ms ease,
			background-color 120ms ease;
	}

	.card:hover {
		transform: translateY(-1px);
		border-color: color-mix(in srgb, currentColor 22%, transparent);
		background: color-mix(in srgb, currentColor 5%, transparent);
	}

	.card__title {
		font-weight: 650;
		letter-spacing: -0.01em;
	}

	.card__desc {
		margin-top: 0.35rem;
		color: color-mix(in srgb, currentColor 72%, transparent);
	}

	.card__meta {
		margin-top: 0.65rem;
		font-size: 0.85rem;
		color: color-mix(in srgb, currentColor 60%, transparent);
	}

	.notice {
		border-radius: 12px;
		padding: 0.9rem 1rem;
		border: 1px dashed color-mix(in srgb, currentColor 22%, transparent);
		background: color-mix(in srgb, currentColor 2%, transparent);
	}

	.notice__title {
		font-weight: 650;
		margin-bottom: 0.25rem;
	}

	.notice__body {
		margin: 0;
		color: color-mix(in srgb, currentColor 74%, transparent);
	}
</style>
