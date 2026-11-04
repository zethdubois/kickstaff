<!--
  @docs: docs/guides/ops-accounts-ui-map.md
  @component: OpsResourceNav.svelte
  One link per manifest resource that has an ops page.
-->
<script lang="ts">
  import type { OpsResourceLink } from "./opsResources";

  type Props = {
    links: OpsResourceLink[];
    current: string;
  };

  let { links, current }: Props = $props();
</script>

<nav class="ops__nav" aria-label="Ops">
  <span class="ops__navCategory">Operations:</span>
  {#each links as link, i (link.name)}
    {#if i > 0}
      <span class="ops__navSep" aria-hidden="true">·</span>
    {/if}
    {#if link.name === current}
      <span class="ops__navCurrent">{link.shortLabel}</span>
    {:else}
      <a class="ops__navLink" href={link.href}>{link.shortLabel}</a>
    {/if}
  {/each}
</nav>

<style>
  .ops__nav {
    margin-bottom: 0.75rem;
    font-size: 0.88rem;
    color: color-mix(in srgb, currentColor 65%, transparent);
  }

  .ops__navCategory {
    font-weight: 700;
    color: color-mix(in srgb, currentColor 88%, transparent);
    margin-right: 0.45rem;
  }

  .ops__navLink {
    color: inherit;
    font-weight: 600;
    text-decoration: underline;
    text-underline-offset: 0.12em;
  }

  .ops__navSep {
    margin: 0 0.35rem;
  }

  .ops__navCurrent {
    font-weight: 600;
  }
</style>
