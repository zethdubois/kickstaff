<script lang="ts">
  import { page } from "$app/state";

  let { children } = $props();
</script>

<svelte:head>
  <title>Settings</title>
</svelte:head>

<div class="settings">
  <nav class="settings__tabs" aria-label="Settings sections">
    <a
      class="settings__tab"
      href="/settings/dashboard"
      aria-current={page.url.pathname === "/settings/dashboard" ? "page" : undefined}
      >Dashboard</a
    >
  </nav>

  {@render children()}
</div>

<style>
  .settings {
    max-width: 44rem;
    margin: 0 auto;
    padding: 1.5rem 1.25rem 3rem;
  }

  .settings__tabs {
    display: flex;
    gap: 0.35rem;
    margin-bottom: 1.25rem;
    border-bottom: 1px solid color-mix(in srgb, currentColor 14%, transparent);
    padding-bottom: 0.5rem;
  }

  .settings__tab {
    font: inherit;
    font-weight: 650;
    font-size: 0.95rem;
    padding: 0.35rem 0.65rem;
    border-radius: 8px;
    color: inherit;
    text-decoration: none;
    border: 1px solid transparent;
  }

  .settings__tab:hover {
    background: color-mix(in srgb, currentColor 6%, transparent);
  }

  .settings__tab[aria-current="page"] {
    border-color: color-mix(in srgb, currentColor 18%, transparent);
    background: color-mix(in srgb, currentColor 8%, transparent);
  }
</style>
