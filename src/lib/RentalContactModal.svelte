<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import type { CitySlug } from '$lib/cities';

	let {
		open = $bindable(false),
		citySlug,
		cityLabel
	}: {
		open: boolean;
		citySlug: CitySlug;
		cityLabel: string;
	} = $props();

	let name = $state('');
	let email = $state('');
	let message = $state('');
	let hp = $state('');
	let sending = $state(false);
	let err = $state<string | null>(null);
	let ok = $state(false);

	function reset() {
		name = '';
		email = '';
		message = '';
		hp = '';
		err = null;
		ok = false;
	}

	function close() {
		open = false;
		reset();
	}

	async function submit(e: Event) {
		e.preventDefault();
		if (hp.trim()) return;
		err = null;
		sending = true;
		try {
			const res = await fetch('/api/rental-contact', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					citySlug,
					name: name.trim(),
					email: email.trim(),
					message: message.trim(),
					website: hp
				})
			});
			const data = (await res.json().catch(() => ({}))) as { message?: string };
			if (!res.ok) {
				err = data.message ?? 'Could not send. Try again later.';
				return;
			}
			ok = true;
		} catch {
			err = 'Network error.';
		} finally {
			sending = false;
		}
	}

	function onWindowKeydown(e: KeyboardEvent) {
		if (!open) return;
		if (e.key === 'Escape') close();
	}
</script>

<svelte:window onkeydown={onWindowKeydown} />

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="rentalContact__overlay"
		transition:fade={{ duration: 170 }}
		role="presentation"
		onclick={close}
	>
		<div
			class="rentalContact__dialog"
			transition:scale={{ duration: 220, start: 0.92, opacity: 0 }}
			onclick={(e) => e.stopPropagation()}
			role="dialog"
			aria-modal="true"
			aria-labelledby="rentalContact-title"
			tabindex="-1"
		>
			<h2 id="rentalContact-title" class="rentalContact__title">Contact us — {cityLabel}</h2>
			{#if ok}
				<p class="rentalContact__ok">Thanks — we’ll get back to you soon.</p>
				<button class="rentalContact__btn" type="button" onclick={close}>Close</button>
			{:else}
				<form class="rentalContact__form" onsubmit={submit}>
					<label class="rentalContact__field">
						<span>Name</span>
						<input
							class="rentalContact__input"
							name="name"
							type="text"
							autocomplete="name"
							required
							maxlength="120"
							bind:value={name}
							disabled={sending}
						/>
					</label>
					<label class="rentalContact__field">
						<span>Email</span>
						<input
							class="rentalContact__input"
							name="email"
							type="email"
							autocomplete="email"
							required
							maxlength="254"
							bind:value={email}
							disabled={sending}
						/>
					</label>
					<label class="rentalContact__field">
						<span>Message</span>
						<textarea
							class="rentalContact__textarea"
							name="message"
							rows="5"
							required
							maxlength="4000"
							bind:value={message}
							disabled={sending}
						></textarea>
					</label>
					<div class="rentalContact__hp" aria-hidden="true">
						<label>
							Website
							<input type="text" name="website" tabindex="-1" bind:value={hp} autocomplete="off" />
						</label>
					</div>
					{#if err}
						<p class="rentalContact__err" role="alert">{err}</p>
					{/if}
					<div class="rentalContact__actions">
						<button
							class="rentalContact__btn rentalContact__btn--primary"
							type="submit"
							disabled={sending}
						>
							{sending ? 'Sending…' : 'Send'}
						</button>
						<button class="rentalContact__btn" type="button" disabled={sending} onclick={close}>
							Cancel
						</button>
					</div>
				</form>
			{/if}
		</div>
	</div>
{/if}

<style>
	.rentalContact__overlay {
		position: fixed;
		inset: 0;
		z-index: 200;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: clamp(1rem, 4vw, 2rem);
		background: rgb(0 0 0 / 0.45);
		backdrop-filter: blur(2px);
	}

	.rentalContact__dialog {
		width: min(100%, 26rem);
		max-height: min(90dvh, 36rem);
		overflow: auto;
		padding: clamp(1.25rem, 3vw, 1.75rem);
		border-radius: 0.75rem;
		background: Canvas;
		color: CanvasText;
		border: 1px solid color-mix(in srgb, CanvasText 14%, transparent);
		box-shadow:
			0 24px 48px rgb(0 0 0 / 0.2),
			0 0 0 1px rgb(255 255 255 / 0.06) inset;
		transform-origin: center center;
	}

	.rentalContact__title {
		margin: 0 0 1rem;
		font-size: 1.15rem;
		font-weight: 650;
		line-height: 1.25;
	}

	.rentalContact__form {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}

	.rentalContact__field {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		font-size: 0.88rem;
		font-weight: 600;
	}

	.rentalContact__input,
	.rentalContact__textarea {
		font: inherit;
		font-weight: 450;
		padding: 0.5rem 0.6rem;
		border-radius: 0.4rem;
		border: 1px solid color-mix(in srgb, CanvasText 22%, transparent);
		background: Field;
		color: FieldText;
		box-sizing: border-box;
		width: 100%;
	}

	.rentalContact__textarea {
		resize: vertical;
		min-height: 6rem;
		line-height: 1.45;
	}

	.rentalContact__hp {
		position: absolute;
		left: -9999px;
		width: 1px;
		height: 1px;
		overflow: hidden;
	}

	.rentalContact__err {
		margin: 0;
		font-size: 0.88rem;
		color: #b91c1c;
	}

	.rentalContact__ok {
		margin: 0 0 1rem;
		line-height: 1.45;
	}

	.rentalContact__actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 0.25rem;
	}

	.rentalContact__btn {
		appearance: none;
		font: inherit;
		font-weight: 600;
		font-size: 0.9rem;
		padding: 0.45rem 1rem;
		border-radius: 0.45rem;
		border: 1px solid color-mix(in srgb, CanvasText 28%, transparent);
		background: color-mix(in srgb, Canvas 92%, transparent);
		color: inherit;
		cursor: pointer;
	}

	.rentalContact__btn:disabled {
		opacity: 0.65;
		cursor: not-allowed;
	}

	.rentalContact__btn--primary {
		background: color-mix(in srgb, CanvasText 12%, transparent);
		border-color: color-mix(in srgb, CanvasText 35%, transparent);
	}
</style>
