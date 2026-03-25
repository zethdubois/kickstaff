<svelte:head>
	<title>Login (dummy)</title>
</svelte:head>

<div class="wrap">
	<dialog open class="dlg" aria-label="LOGIN">
		<header class="dlg__header">
			<div class="dlg__title">LOGIN</div>
			<div class="dlg__badge">DUMMY</div>
		</header>

		<p class="dlg__body">
			This is a <strong>temporary dummy login</strong>. Clicking OK will set a cookie so you can access the
			internal dashboard. Real authentication will be built later.
		</p>

		<form method="POST" class="dlg__actions">
			<input type="hidden" name="intent" value="ok" />
			<button class="btn" type="submit">OK</button>
		</form>
	</dialog>
</div>

<style>
	.wrap {
		min-height: calc(100vh - 4rem);
		display: grid;
		place-items: center;
		padding: 2rem 1.25rem;
	}

	.dlg {
		width: min(34rem, 100%);
		border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
		border-radius: 14px;
		padding: 1.1rem 1.1rem 1rem;
		background: color-mix(in srgb, currentColor 3%, white);
		color: inherit;
	}

	.dlg::backdrop {
		background: color-mix(in srgb, black 45%, transparent);
	}

	.dlg__header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 0.65rem;
	}

	.dlg__title {
		font-size: 1.1rem;
		font-weight: 750;
		letter-spacing: 0.02em;
	}

	.dlg__badge {
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		padding: 0.2rem 0.5rem;
		border-radius: 999px;
		border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
		color: color-mix(in srgb, currentColor 72%, transparent);
	}

	.dlg__body {
		margin: 0;
		color: color-mix(in srgb, currentColor 78%, transparent);
	}

	.dlg__actions {
		margin-top: 0.95rem;
		display: flex;
		justify-content: flex-end;
	}

	.btn {
		appearance: none;
		border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
		background: color-mix(in srgb, currentColor 8%, transparent);
		color: inherit;
		border-radius: 10px;
		padding: 0.55rem 0.85rem;
		font-weight: 650;
		cursor: pointer;
	}

	.btn:hover {
		background: color-mix(in srgb, currentColor 12%, transparent);
	}
</style>

