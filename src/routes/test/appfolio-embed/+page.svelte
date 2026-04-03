<script lang="ts">
	import { APPFOLIO_LISTINGS_DEFAULT_HOST, appfolioListingEmbedUrl } from '$lib/appfolioListingEmbedUrl';

	const hostUrl = APPFOLIO_LISTINGS_DEFAULT_HOST;
	const propertyGroup = 'Moscow';

	const embedUrl = appfolioListingEmbedUrl({
		hostUrl,
		propertyGroup,
	});
</script>

<svelte:head>
	<title>AppFolio listing embed (test)</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="wrap">
	<h1>AppFolio listing embed (test)</h1>

	<p class="lede">
		<strong>Moscow</strong> here is an AppFolio <em>property group</em> name (whatever your account uses to group
		that inventory)—not a separate <code>city=</code> query param. Adjust the constant in this route if your group
		label differs.
	</p>

	<p>
		AppFolio’s vendor snippet calls <code>Appfolio.Listing()</code>, which ends with
		<code>document.write(…)</code> to inject an iframe. That only works during the initial HTML parse; in SvelteKit,
		running it after navigation or hydration can break or clear the page. This page builds the
		<strong>same URL</strong> the script would use and renders a normal <code>&lt;iframe&gt;</code> instead.
	</p>

	<p class="meta">
		<a href="/admin/rental-links">Admin: rental links</a>
	</p>

	<div class="frameWrap">
		<iframe title="Available properties (AppFolio)" src={embedUrl} class="frame"></iframe>
	</div>

	<details class="url">
		<summary>Embed URL</summary>
		<code>{embedUrl}</code>
	</details>
</div>

<style>
	.wrap {
		max-width: 52rem;
		margin: 0 auto;
		padding: clamp(1.5rem, 4vw, 2.5rem) clamp(1rem, 3vw, 1.5rem) 3rem;
		color: var(--color-fg, #0f172a);
	}

	h1 {
		font-size: clamp(1.35rem, 2.5vw, 1.75rem);
		font-weight: 700;
		margin: 0 0 1rem;
	}

	p {
		margin: 0 0 1rem;
		line-height: 1.55;
		font-size: 0.95rem;
	}

	.lede {
		font-size: 1rem;
	}

	code {
		font-size: 0.88em;
		background: rgb(15 23 42 / 0.06);
		padding: 0.12em 0.35em;
		border-radius: 0.25rem;
	}

	.meta {
		font-size: 0.9rem;
	}

	.meta a {
		color: var(--color-link, #0369a1);
	}

	.frameWrap {
		margin: 1.25rem 0 0;
		border: 1px solid rgb(15 23 42 / 0.12);
		border-radius: 0.5rem;
		overflow: hidden;
		background: #fff;
	}

	.frame {
		display: block;
		width: 100%;
		height: 500px;
		border: 0;
	}

	.url {
		margin-top: 1.25rem;
		font-size: 0.85rem;
	}

	.url summary {
		cursor: pointer;
		font-weight: 600;
		margin-bottom: 0.5rem;
	}

	.url code {
		display: block;
		padding: 0.75rem;
		word-break: break-all;
		white-space: pre-wrap;
		background: rgb(15 23 42 / 0.06);
		border-radius: 0.35rem;
	}
</style>
