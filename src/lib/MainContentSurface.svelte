<!--
  @docs: docs/sop-svelte-and-components.md
  @component: MainContentSurface.svelte
-->
<script lang="ts">
  import { onMount } from "svelte";
  import { devConsole } from "$lib/devConsole/state.svelte";
  import { focusStack, Z_MAIN_ELEVATED } from "$lib/client/focusStack.svelte";
  import { pointerTargetsConsoleBand } from "$lib/shellLayout";

  type Props = {
    children: import("svelte").Snippet;
    /** Full viewport width (rental landings). Default shrink-wraps to route content. */
    fullWidth?: boolean;
  };

  let { children, fullWidth = false }: Props = $props();

  let surfaceEl: HTMLDivElement | undefined = $state();

  const elevated = $derived(
    devConsole.consoleOpen && focusStack.activeLayer === "main",
  );

  function onMainFocusIn() {
    if (!devConsole.consoleOpen) return;
    focusStack.focusMain();
  }

  $effect(() => {
    if (!devConsole.consoleOpen) {
      focusStack.reset();
    } else {
      focusStack.focusConsole();
    }
  });

  onMount(() => {
    function onDocPointerDown(event: PointerEvent) {
      if (!devConsole.consoleOpen) return;

      if (pointerTargetsConsoleBand(event)) {
        focusStack.focusConsole();
        return;
      }

      const target = event.target as Node | null;
      if (target && surfaceEl?.contains(target)) {
        focusStack.focusMain();
      }
    }

    document.addEventListener("pointerdown", onDocPointerDown, true);
    return () =>
      document.removeEventListener("pointerdown", onDocPointerDown, true);
  });
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  bind:this={surfaceEl}
  class="mainSurface"
  class:mainSurface--elevated={elevated}
  class:mainSurface--fullWidth={fullWidth}
  style:z-index={elevated ? Z_MAIN_ELEVATED : undefined}
  onfocusin={onMainFocusIn}
>
  {@render children()}
</div>

<style>
  .mainSurface {
    position: relative;
    width: fit-content;
    max-width: 100%;
  }

  .mainSurface:not(.mainSurface--fullWidth) {
    margin-inline: auto;
  }

  .mainSurface--fullWidth {
    width: 100%;
  }

  .mainSurface--elevated {
    background: Canvas;
  }
</style>
