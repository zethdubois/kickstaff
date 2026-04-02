<script lang="ts">
	import { page } from '$app/state';

	let { data, form } = $props();
</script>

<svelte:head>
	<title>{data.mustChangePassword ? 'Set your password' : 'Change password'}</title>
</svelte:head>

<div class="wrap">
	<dialog open class="dlg" aria-label="Password">
		<header class="dlg__header">
			<div class="dlg__title">
				{data.mustChangePassword ? 'Set your password' : 'Change password'}
			</div>
		</header>

		{#if data.mustChangePassword}
			<p class="dlg__hint">
				Your account was created by an administrator. Choose a new password to continue.
			</p>
		{/if}

		{#if form?.message}
			<p class="dlg__err" role="alert">{form.message}</p>
		{/if}

		<form method="POST" class="dlg__form" autocomplete="on">
			{#if !data.mustChangePassword}
				<label class="field">
					<span class="field__label">Current password</span>
					<input
						class="field__input"
						name="current"
						type="password"
						required
						autocomplete="current-password"
					/>
				</label>
			{/if}
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
				<span class="field__label">Confirm new password</span>
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
				<button class="btn btn--primary" type="submit">Save</button>
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
		width: min(34rem, 100%);
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
		font-size: 1.1rem;
		font-weight: 750;
		letter-spacing: 0.02em;
	}

	.dlg__hint {
		margin: 0 0 0.85rem;
		color: color-mix(in srgb, currentColor 78%, transparent);
		font-size: 0.95rem;
	}

	.dlg__err {
		margin: 0 0 0.65rem;
		padding: 0.5rem 0.65rem;
		border-radius: 10px;
		background: color-mix(in srgb, #c0392b 12%, transparent);
		color: color-mix(in srgb, #7b241c 90%, Canvas);
		font-size: 0.9rem;
	}

	.dlg__form {
		display: grid;
		gap: 0.65rem;
	}

	.field {
		display: grid;
		gap: 0.25rem;
	}

	.field__label {
		font-size: 0.82rem;
		font-weight: 600;
		color: color-mix(in srgb, currentColor 72%, transparent);
	}

	.field__input {
		font: inherit;
		padding: 0.5rem 0.6rem;
		border-radius: 10px;
		border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
		background: color-mix(in srgb, Canvas 96%, transparent);
		color: inherit;
	}

	.field__input:focus {
		outline: 2px solid color-mix(in srgb, currentColor 28%, transparent);
		outline-offset: 1px;
	}

	.dlg__actions {
		display: flex;
		justify-content: flex-end;
		margin-top: 0.25rem;
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

	.btn--primary {
		background: color-mix(in srgb, currentColor 14%, transparent);
	}
</style>
