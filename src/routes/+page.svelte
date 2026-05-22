<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import {
    categoryBorder,
    categoryForeground,
    categoryTintBackground,
    hashCategoryHue,
  } from "$lib/categoryColor";
  import { materializeDashboardCommand } from "$lib/client/dashboardCommandMaterialize";
  import { runCommand } from "$lib/devConsole/commands";
  import { devConsole } from "$lib/devConsole/state.svelte";

  let { data } = $props();

  let runningKey = $state<string | null>(null);

  async function runHubCommand(commandKey: string) {
    if (runningKey) return;
    runningKey = commandKey;
    try {
      await materializeDashboardCommand(commandKey);
      await invalidateAll();
      if (!devConsole.consoleOpen) {
        devConsole.consoleOpen = true;
      }
      await runCommand(commandKey);
    } finally {
      runningKey = null;
    }
  }
</script>

<svelte:head>
  <title>Kick Assets Ops</title>
</svelte:head>

<div class="dash">
  <header class="dash__header">
    <h1 class="dash__title">Internal Ops Dashboard</h1>
    <p class="dash__subtitle">
      Quick links and commands you have run at least once. Run more from the KAM
      palette (<kbd>Ctrl+/</kbd>).
    </p>
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
                    {#if item.itemType === "command" && item.commandKey}
                      <button
                        type="button"
                        class="card__open card__run"
                        disabled={runningKey === item.commandKey}
                        onclick={() => runHubCommand(item.commandKey!)}
                      >
                        {runningKey === item.commandKey ? "Running…" : "Run command"}
                      </button>
                    {:else if item.hyperlink}
                      <a
                        class="card__open"
                        href={item.hyperlink}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open in new tab
                      </a>
                    {/if}
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

  .card__run {
    appearance: none;
    border: none;
    background: none;
    padding: 0;
    cursor: pointer;
    font: inherit;
  }

  .card__run:disabled {
    opacity: 0.6;
    cursor: wait;
  }
</style>
