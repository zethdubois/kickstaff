<script lang="ts">
  import { onMount, tick } from "svelte";
  import { devConsole } from "./state.svelte";
  import { runCommand } from "./commands";

  let input = $state("");
  let error = $state("");
  let inputEl: HTMLInputElement | undefined = $state();

  const promptPrefix = $derived(
    devConsole.kickagentModeActive ? "[KA] >" : "›",
  );

  const placeholder = $derived(
    devConsole.kickagentModeActive
      ? "hello · :help · :exit"
      : "help · console · clear",
  );

  const formAriaLabel = $derived(
    devConsole.kickagentModeActive
      ? "KAM command palette, kickagent mode active"
      : "KAM command palette",
  );

  function isPaletteHotkey(e: KeyboardEvent): boolean {
    if (e.key !== "/") return false;
    return e.ctrlKey || e.metaKey;
  }

  function isConsoleFocusHotkey(e: KeyboardEvent): boolean {
    return (
      e.code === "Backquote" && !e.ctrlKey && !e.metaKey && !e.altKey
    );
  }

  onMount(() => {
    function onKey(e: KeyboardEvent) {
      if (e.repeat) return;
      if (isConsoleFocusHotkey(e)) {
        e.preventDefault();
        devConsole.focusConsolePrompt();
        return;
      }
      if (isPaletteHotkey(e)) {
        e.preventDefault();
        devConsole.togglePalette();
        return;
      }
      if (e.key === "Escape" && devConsole.paletteOpen) {
        e.preventDefault();
        devConsole.paletteOpen = false;
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  $effect(() => {
    if (devConsole.paletteOpen) {
      void tick().then(() => inputEl?.focus());
    } else {
      input = "";
      error = "";
    }
  });

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    const result = await runCommand(input);
    if (result.ok) {
      devConsole.paletteOpen = false;
    } else {
      error = result.error;
    }
  }

  function close() {
    devConsole.paletteOpen = false;
  }
</script>

{#if devConsole.paletteOpen}
  <div
    class="overlay"
    role="presentation"
    onclick={close}
    onkeydown={(e) => {
      if (e.key === "Escape") close();
    }}
  >
    <div
      class="modal"
      class:modal--kickagent={devConsole.kickagentModeActive}
      role="dialog"
      tabindex="-1"
      aria-modal="true"
      aria-label="KAM command palette"
      onclick={(e) => e.stopPropagation()}
    >
      <form
        class="prompt"
        class:prompt--kickagent={devConsole.kickagentModeActive}
        aria-label={formAriaLabel}
        onsubmit={submit}
      >
        <span
          class="caret"
          class:caret--kickagent={devConsole.kickagentModeActive}
          aria-hidden="true">{promptPrefix}</span
        >
        <input
          bind:this={inputEl}
          bind:value={input}
          type="text"
          {placeholder}
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
          spellcheck="false"
        />
      </form>
      {#if error}
        <p class="error">{error}</p>
      {/if}
      <p class="hint">
        Enter to run · Esc or Ctrl+/ (⌘+/) to close · ` opens the KAM Console pane
      </p>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(2px);
    z-index: 1000;
    display: grid;
    place-items: start center;
    padding-top: 18vh;
  }

  .modal {
    width: min(640px, 92vw);
    background: #0f1115;
    color: #e6e6e6;
    border: 1px solid #2a2f3a;
    border-radius: 12px;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
    padding: 0.65rem 0.85rem 0.6rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  }

  .modal--kickagent {
    border-left: 3px solid #62d4a3;
  }

  .prompt {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 0.4rem;
  }

  .prompt--kickagent {
    padding-left: 0.15rem;
  }

  .caret {
    color: #9aa3b3;
    font-weight: 700;
    white-space: pre;
    font-size: 1rem;
    padding: 0.55rem 0;
  }

  .caret--kickagent {
    color: #62d4a3;
    letter-spacing: 0.04em;
  }

  .prompt input {
    width: 100%;
    background: transparent;
    color: inherit;
    border: 0;
    outline: none;
    font: inherit;
    font-size: 1rem;
    padding: 0.55rem 0.4rem;
  }

  .error {
    margin: 0.15rem 0 0;
    color: #ff7676;
    font-size: 0.82rem;
    padding: 0 0.4rem;
  }

  .hint {
    margin: 0.45rem 0 0;
    color: #6a7384;
    font-size: 0.72rem;
    letter-spacing: 0.03em;
    padding: 0 0.4rem;
  }
</style>
