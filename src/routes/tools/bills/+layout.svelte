<!--
  @docs-order
  1) /home/golem/projects/publicweb/AGENTS.md
  2) /home/golem/projects/publicweb/docs/guides/tools-bills-architecture.md
  3) /home/golem/projects/publicweb/docs/guides/tools-bills-ui-map.md
-->
<script lang="ts">
  import { page } from "$app/state";
  import TabBar from "$lib/components/TabBar.svelte";
  import type { BillsTabId } from "$lib/client/uiSettings.svelte";
  import { setBillsDefaultTab } from "$lib/client/uiSettings.svelte";

  let { children } = $props();

  const tabs = [
    { label: "Transactions", href: "/tools/bills/transactions" },
    {
      label: "Documents",
      href: "/tools/bills/documents",
      match: (p: string) =>
        p === "/tools/bills" || p.startsWith("/tools/bills/documents"),
    },
    { label: "Postings", href: "/tools/bills/postings" },
  ];

  function tabFromPath(pathname: string): BillsTabId | null {
    if (pathname.startsWith("/tools/bills/transactions")) return "transactions";
    if (pathname.startsWith("/tools/bills/postings")) return "postings";
    if (pathname.startsWith("/tools/bills/documents")) return "documents";
    return null;
  }

  $effect(() => {
    const tab = tabFromPath(page.url.pathname);
    if (tab) setBillsDefaultTab(tab);
  });
</script>

<TabBar {tabs} variant="secondary" ariaLabel="Bills sections" />

{@render children()}
