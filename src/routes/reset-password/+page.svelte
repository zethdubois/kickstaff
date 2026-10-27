<script lang="ts">
	let { data, form } = $props();
	const token = $derived(form?.token ?? data.token);
</script>

<svelte:head>
	<title>Reset password</title>
</svelte:head>

<div class="wrap">
	<dialog open class="dlg" aria-label="Reset password">
		<header class="dlg__header">
			<div class="dlg__title">Choose a new password</div>
		</header>

		{#if !token}
			<p class="dlg__hint">
				This link is missing or expired.
				<a href="/forgot-password">Request a new reset email</a>.
			</p>
		{:else}
			<p class="dlg__hint">Pick a new password for your account (at least 8 characters).</p>

			{#if form?.message}
				<p class="dlg__err" role="alert">{form.message}</p>
			{/if}

			<form method="POST" class="dlg__form" autocomplete="on">
				<input type="hidden" name="token" value={token} />
				<label class="field">
					<span class="field__label">New password</span>
					<input
						class="field__input"
						name="password"
						type="password"
						required
						minlength="8"
						autocomplete="new-password"
					/>
				</label>
				<label class="field">
					<span class="field__label">Confirm password</span>
					<input
						class="field__input"
						name="password2"
						type="password"
						required
						minlength="8"
						autocomplete="new-password"
					/>
				</label>
				<div class="dlg__actions">
					<button class="btn btn--primary" type="submit">Save password</button>
					<a class="btn btn--ghost" href="/login">Back to login</a>
				</div>
			</form>
		{/if}
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

	.dlg__err {
		margin: 0 0 0.75rem;
		color: color-mix(in srgb, crimson 70%, currentColor);
		font-size: 0.92rem;
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
