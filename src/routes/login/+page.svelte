<script lang="ts">
	import { page } from '$app/state';

	let { data } = $props();
</script>

<svelte:head>
	<title>Login</title>
</svelte:head>

<div class="wrap">
	<dialog open class="dlg" aria-label="Login">
		<header class="dlg__header">
			<div class="dlg__title">Login</div>
			{#if data.dbTarget}
				<span
					class="dbBadge"
					class:dbBadge--staging={data.dbTarget === 'staging'}
					class:dbBadge--prod={data.dbTarget === 'prod'}
					title={data.dbLabel}
				>
					{data.dbTarget}
				</span>
			{/if}
		</header>

		<p class="dlg__hint">
			Sign in to access the internal ops dashboard. {data.sessionNote} Accounts are created by an
			administrator.
		</p>

		{#if data.canPickDb}
			<p class="dlg__dbHint">
				Database:
				<strong title={data.dbLabel}>{data.dbTarget}</strong>
				<span class="dlg__dbLinks" aria-label="Choose database">
					<a href="/login?db=dev" class:active={data.dbTarget === 'dev'}>dev</a>
					<a href="/login?db=staging" class:active={data.dbTarget === 'staging'}>staging</a>
					<a href="/login?db=prod" class:active={data.dbTarget === 'prod'}>prod</a>
				</span>
			</p>
			<p class="dlg__dbNote">
				Each database has its own accounts and its own sign-in. Signing in here does not sign you
				in anywhere else.
			</p>
		{/if}

		{#if data.dbQueryError}
			<p class="dlg__err" role="alert">{data.dbQueryError}</p>
		{/if}

		{#if page.form?.message}
			<p class="dlg__err" role="alert">{page.form.message}</p>
		{/if}

		<form
			method="POST"
			action={data.canPickDb ? `?/login&db=${data.dbTarget}` : '?/login'}
			class="dlg__form"
			autocomplete="on"
		>
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
			<label class="field">
				<span class="field__label">Password</span>
				<input
					class="field__input"
					name="password"
					type="password"
					required
					autocomplete="current-password"
				/>
			</label>
			<div class="dlg__actions">
				<button class="btn btn--primary" type="submit">Sign in</button>
				<a
					class="btn btn--ghost"
					href={data.canPickDb ? `/forgot-password?db=${data.dbTarget}` : '/forgot-password'}
					>Forgot password</a
				>
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

	.dlg::backdrop {
		background: color-mix(in srgb, black 45%, transparent);
	}

	.dlg__header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.65rem;
	}

	.dlg__title {
		font-size: 1.1rem;
		font-weight: 750;
		letter-spacing: 0.02em;
	}

	.dbBadge {
		font-size: 0.58rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		padding: 0.12rem 0.4rem;
		border-radius: 4px;
		background: #1a2a3d;
		color: #8ab4f8;
		border: 1px solid #2a4a6a;
	}

	.dbBadge--staging {
		background: #2a2818;
		color: #d4c05a;
		border-color: #5a5020;
	}

	.dbBadge--prod {
		background: #3a2218;
		color: #f0a060;
		border-color: #6a4020;
	}

	.dlg__hint {
		margin: 0 0 0.85rem;
		color: color-mix(in srgb, currentColor 78%, transparent);
		font-size: 0.95rem;
	}

	.dlg__dbHint {
		margin: 0 0 0.85rem;
		font-size: 0.85rem;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.35rem 0.5rem;
		opacity: 0.9;
	}

	.dlg__dbNote {
		margin: -0.5rem 0 0.85rem;
		font-size: 0.78rem;
		opacity: 0.65;
	}

	.dlg__dbLinks {
		display: inline-flex;
		gap: 0.35rem;
	}

	.dlg__dbLinks a {
		font-size: 0.78rem;
		font-weight: 650;
		text-decoration: none;
		padding: 0.15rem 0.45rem;
		border-radius: 6px;
		border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
		color: inherit;
		opacity: 0.75;
	}

	.dlg__dbLinks a:hover {
		opacity: 1;
	}

	.dlg__dbLinks a.active {
		opacity: 1;
		background: color-mix(in srgb, currentColor 10%, transparent);
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
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: 0.5rem;
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
		text-decoration: none;
	}

	.btn:hover {
		background: color-mix(in srgb, currentColor 12%, transparent);
	}

	.btn--primary {
		background: color-mix(in srgb, currentColor 14%, transparent);
	}

	.btn--ghost {
		background: transparent;
		font-weight: 550;
	}
</style>
