<script lang="ts">
	let { form } = $props();
</script>

<svelte:head>
	<title>Forgot password</title>
</svelte:head>

<div class="wrap">
	<dialog open class="dlg" aria-label="Forgot password">
		<header class="dlg__header">
			<div class="dlg__title">Forgot password</div>
		</header>

		<p class="dlg__hint">
			Enter your account email. If it matches a user, we send a one-hour reset link.
		</p>

		{#if form?.message}
			<p class="dlg__msg" class:dlg__msg--ok={form.ok} class:dlg__err={!form.ok} role="status">
				{form.message}
			</p>
		{/if}

		<form method="POST" class="dlg__form" autocomplete="on">
			<label class="field">
				<span class="field__label">Email</span>
				<input
					class="field__input"
					name="email"
					type="email"
					required
					autocomplete="username"
				/>
			</label>
			<div class="dlg__actions">
				<button class="btn btn--primary" type="submit">Send reset link</button>
				<a class="btn btn--ghost" href="/login">Back to login</a>
			</div>
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
		position: relative;
		inset: auto;
		width: min(34rem, 100%);
		height: auto;
		margin: 0;
		border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
		border-radius: 14px;
		padding: 1.1rem 1.1rem 1rem;
		background: color-mix(in srgb, currentColor 3%, white);
		color: inherit;
	}

	.dlg__header {
		margin-bottom: 0.65rem;
	}

	.dlg__title {
		font-weight: 650;
		font-size: 1.15rem;
	}

	.dlg__hint {
		margin: 0 0 0.85rem;
		opacity: 0.78;
		font-size: 0.92rem;
		line-height: 1.45;
	}

	.dlg__msg {
		margin: 0 0 0.75rem;
		font-size: 0.92rem;
	}

	.dlg__msg--ok {
		color: color-mix(in srgb, green 55%, currentColor);
	}

	.dlg__err {
		color: color-mix(in srgb, crimson 70%, currentColor);
	}

	.dlg__form {
		display: grid;
		gap: 0.75rem;
	}

	.field {
		display: grid;
		gap: 0.3rem;
	}

	.field__label {
		font-size: 0.82rem;
		opacity: 0.8;
	}

	.field__input {
		padding: 0.55rem 0.65rem;
		border-radius: 8px;
		border: 1px solid color-mix(in srgb, currentColor 22%, transparent);
		background: color-mix(in srgb, currentColor 4%, white);
		color: inherit;
		font: inherit;
	}

	.dlg__actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 0.25rem;
	}

	.btn {
		appearance: none;
		border: 1px solid color-mix(in srgb, currentColor 22%, transparent);
		border-radius: 8px;
		padding: 0.5rem 0.85rem;
		font: inherit;
		cursor: pointer;
		text-decoration: none;
		color: inherit;
		background: color-mix(in srgb, currentColor 6%, white);
	}

	.btn--primary {
		background: color-mix(in srgb, currentColor 14%, white);
		font-weight: 600;
	}

	.btn--ghost {
		background: transparent;
	}
</style>
