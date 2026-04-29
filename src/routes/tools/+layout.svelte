<!--
  @docs-order
  1) /home/golem/projects/publicweb/AGENTS.md
  2) /home/golem/projects/publicweb/docs/guides/tools-architecture.md
  3) /home/golem/projects/publicweb/docs/guides/tools-ui-map.md
-->
<script lang="ts">
        import TabBar from '$lib/components/TabBar.svelte';
        import PanelCard from '$lib/components/PanelCard.svelte';

        let { children } = $props();

        const tabs = [
                {
                        label: 'Bills',
                        href: '/tools/bills',
                        match: (p: string) => p === '/tools' || p.startsWith('/tools/bills')
                },
                { label: 'Units', href: '/tools/units' },
                { label: 'Reports', href: '/tools/reports' }
        ];
</script>

<svelte:head>
        <title>Tools</title>
</svelte:head>

<div class="toolsLayout">
        <TabBar {tabs} variant="primary" ariaLabel="Tools" />
        <PanelCard>
                {@render children()}
        </PanelCard>
</div>

<style>
        .toolsLayout {
                max-width: 64rem;
                margin: 0 auto;
                padding: 1.5rem 1.25rem 3rem;
        }
</style>
