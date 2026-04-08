<script lang="ts">
  import { page } from "$app/state";
  import {
    categoryBorder,
    categoryForeground,
    categoryTintBackground,
    hashCategoryHue,
  } from "$lib/categoryColor";

  let { data } = $props();
</script>

<svelte:head>
  <title>Kickass Ops</title>
</svelte:head>

<div class="dash">
  <header class="dash__header">
    <div class="dash__headingRow">
      <div>
        <h1 class="dash__title">Internal Ops Dashboard</h1>
        <p class="dash__subtitle">
          Quick links for day-to-day operations.
          {#if page.data.user}
            Signed in as <strong>{page.data.user.email}</strong>.
          {/if}
        </p>
      </div>
      <form method="POST" action="/logout" class="dash__signOut">
        <button class="dash__signOutBtn" type="submit">Sign out</button>
      </form>
    </div>
  </header>

  <section class="dash__section" aria-label="Resources">
    {#if data.dashboardColumns.length === 0}
      <p class="dash__empty">
        No dashboard links yet. Add some under
        <a href="/settings/add-link">Settings → Add link</a>.
      </p>
    {:else}
      <div class="dash__columns">
        {#each data.dashboardColumns as col (col.category)}
          {@const hue = hashCategoryHue(col.category)}
          <div class="dash__column">
            <h2
              class="dash__cat"
              style="color: {categoryForeground(
                hue,
              )}; border-left: 3px solid {categoryBorder(
                hue,
              )}; padding-left: 0.5rem;"
            >
              {col.category}
            </h2>
            <div class="cards">
              {#each col.links as item (item.id)}
                <details
                  class="card card--dash"
                  style="background-color: {categoryTintBackground(
                    hue,
                  )}; border: 1px solid {categoryBorder(hue)};"
                >
                  <summary class="card__summary">
                    <span class="card__title">{item.label}</span>
                    <span class="card__chev" aria-hidden="true"></span>
                  </summary>
                  <div class="card__expand">
                    <p class="card__desc">{item.description}</p>
                    <a
                      class="card__open"
                      href={item.hyperlink}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open in new tab
                    </a>
                  </div>
                </details>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </section>
</div>

<style>
  .dash__header {
    margin-bottom: 1.25rem;
  }

  .dash__headingRow {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem 1rem;
  }

  .dash__signOut {
    margin: 0;
  }

  .dash__signOutBtn {
    appearance: none;
    font: inherit;
    color: inherit;
    padding: 0.4rem 0.65rem;
    border-radius: 10px;
    border: 1px solid color-mix(in srgb, currentColor 16%, transparent);
    background: color-mix(in srgb, currentColor 3%, transparent);
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 600;
  }

  .dash__signOutBtn:hover {
    background: color-mix(in srgb, currentColor 7%, transparent);
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

  .dash__empty {
    margin: 0;
    color: color-mix(in srgb, currentColor 72%, transparent);
  }

  .dash__empty a {
    color: inherit;
    font-weight: 600;
  }

  .dash__columns {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
    gap: 1.25rem 1.5rem;
    align-items: start;
  }

  .dash__column {
    min-width: 0;
  }

  .dash__cat {
    margin: 0 0 0.5rem;
    font-size: 0.82rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .cards {
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
  }

  .card--dash {
    border-radius: 12px;
    overflow: hidden;
  }

  .card__summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    cursor: pointer;
    list-style: none;
    font: inherit;
    color: inherit;
  }

  .card__summary::-webkit-details-marker {
    display: none;
  }

  .card__title {
    font-weight: 650;
    letter-spacing: -0.01em;
    text-align: left;
  }

  .card__chev {
    flex-shrink: 0;
    width: 0.45rem;
    height: 0.45rem;
    border-right: 2px solid color-mix(in srgb, currentColor 45%, transparent);
    border-bottom: 2px solid color-mix(in srgb, currentColor 45%, transparent);
    transform: rotate(45deg);
    transition: transform 0.15s ease;
    margin-top: -0.15rem;
  }

  .card--dash[open] .card__chev {
    transform: rotate(225deg);
    margin-top: 0.1rem;
  }

  .card__expand {
    padding: 0 1rem 1rem;
    margin: 0;
    border-top: 1px solid color-mix(in srgb, currentColor 12%, transparent);
  }

  .card__desc {
    margin: 0.65rem 0 0.5rem;
    color: color-mix(in srgb, currentColor 76%, transparent);
    font-size: 0.95rem;
    line-height: 1.4;
  }

  .card__open {
    display: inline-block;
    font-size: 0.88rem;
    font-weight: 600;
    color: inherit;
    text-decoration: underline;
    text-underline-offset: 0.15em;
  }

  .card__open:hover {
    opacity: 0.9;
  }
</style>
