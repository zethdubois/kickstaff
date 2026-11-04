<script lang="ts">
  import { onMount, tick } from "svelte";
  import { devConsole } from "./state.svelte";
  import {
    handleHistoryKeydown,
    resetHistoryNavigation,
  } from "./commandHistory";
  import { runCommand } from "./commands";
  import { Z_MODAL } from "$lib/client/focusStack.svelte";

  let input = $state("");
  let error = $state("");
  let inputEl: HTMLInputElement | undefined = $state();
  let transcriptEl: HTMLDivElement | undefined = $state();
  /** Entry id at the start of this palette session. Lines after it are the transcript. */
  let transcriptFloorId = $state(0);
  let showTranscript = $state(false);

  const transcriptEntries = $derived(
    showTranscript
      ? devConsole.entries.filter((entry) => entry.id > transcriptFloorId)
      : [],
  );

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
      ? "Command palette, kickagent mode active"
      : "Command palette",
  );

  function isPaletteHotkey(e: KeyboardEvent): boolean {
    if (e.key !== "/") return false;
    return e.ctrlKey || e.metaKey;
  }

  function isConsoleFocusHotkey(e: KeyboardEvent): boolean {
    return e.code === "Backquote" && !e.ctrlKey && !e.metaKey && !e.altKey;
  }

  onMount(() => {
    function onKey(e: KeyboardEvent) {
      if (e.repeat) return;
      // Capture phase: win over the focused palette input (else ` would type).
      if (isConsoleFocusHotkey(e)) {
        e.preventDefault();
        e.stopPropagation();
        devConsole.toggleConsoleHotkey();
        return;
      }
      if (isPaletteHotkey(e)) {
        e.preventDefault();
        e.stopPropagation();
        devConsole.togglePalette();
        return;
      }
      if (e.key === "Escape" && devConsole.paletteOpen) {
        e.preventDefault();
        e.stopPropagation();
        close();
      }
    }
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  });

  $effect(() => {
    if (devConsole.paletteOpen) {
      resetHistoryNavigation();
      void tick().then(() => inputEl?.focus());
    } else {
      input = "";
      error = "";
      showTranscript = false;
    }
  });

  $effect(() => {
    transcriptEntries.length;
    void tick().then(() => {
      transcriptEl?.scrollTo({ top: transcriptEl.scrollHeight });
    });
  });

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    // Raise the floor every submit so the modal only shows this command's
    // lines — does not clear the console pane / persisted klog.
    const floor = devConsole.entries.at(-1)?.id ?? 0;
    transcriptFloorId = floor;
    const result = await runCommand(input);
    if (devConsole.consoleOpen) {
      if (result.ok) devConsole.paletteOpen = false;
      else error = result.error;
      return;
    }
    const hasNew = devConsole.entries.some((entry) => entry.id > floor);
    if (hasNew) showTranscript = true;
    if (result.ok) {
      input = "";
      error = "";
    } else if (hasNew) {
      error = "";
    } else {
      error = result.error;
    }
    await tick();
    inputEl?.focus();
  }

  function close() {
    devConsole.paletteOpen = false;
  }
</script>

{#if devConsole.paletteOpen}
  <div
    class="overlay"
    style:z-index={Z_MODAL}
    role="presentation"
    onclick={close}
    onkeydown={(e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    }}
  >
    <div
      class="modal"
      class:modal--kickagent={devConsole.kickagentModeActive}
      class:modal--withTranscript={transcriptEntries.length > 0}
      role="dialog"
      tabindex="-1"
      aria-modal="true"
      aria-label="Command palette"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          close();
          return;
        }
        // Keep other keys from hitting the overlay; Esc must close above.
        e.stopPropagation();
      }}
    >
      <div class="modalHead">
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
            onkeydown={(e) => {
              // Hotkeys (Esc, backtick, Ctrl+/) are handled in document capture.
              handleHistoryKeydown(e, input, (v) => {
                input = v;
              });
            }}
          />
        </form>
        {#if error}
          <p class="error">{error}</p>
        {/if}
        <p class="hint">
          ↑/↓ history · Esc to close · [backtick (`) toggles the full console]
        </p>
      </div>
      {#if transcriptEntries.length > 0}
        <div
          class="transcript"
          bind:this={transcriptEl}
          role="log"
          aria-label="Command output"
        >
          {#each transcriptEntries as entry (entry.id)}
            <pre
              class="line"
              class:line--err={entry.level === "error"}
              class:line--warn={entry.level === "warn"}
              class:line--info={entry.level === "info"}
              class:line--prompt={entry.source ===
                "host:prompt"}>{entry.message}</pre>
          {/each}
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(2px);
    display: grid;
    place-items: start center;
    padding-top: 18vh;
  }

  .modal {
    width: min(640px, 92vw);
    color: #e6e6e6;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    background-color: #0f1115;
    border: 1px solid #2a2f3a;
    border-radius: 12px;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
    padding: 0.65rem 0.85rem 0.6rem;
  }

  .modal--kickagent {
    border-left: 3px solid #62d4a3;
  }

  /* Split chrome: solid prompt head, glass transcript. Modal shell goes clear. */
  .modal--withTranscript {
    background-color: transparent;
    border: none;
    box-shadow: 0 18px 40px rgb(0 0 0 / 0.25);
    padding: 0;
  }

  .modal--withTranscript .modalHead {
    background-color: #0f1115;
    border: 1px solid #2a2f3a;
    border-radius: 12px 12px 0 0;
    border-bottom-color: transparent;
    padding: 0.65rem 0.85rem 0.6rem;
  }

  .modal--withTranscript.modal--kickagent .modalHead {
    border-left: 3px solid #62d4a3;
  }

  .modal--withTranscript.modal--kickagent .transcript {
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

  .prompt input::placeholder {
    font-style: italic;
  }

  .error {
    margin: 0.15rem 0 0;
    color: #ff7676;
    font-size: 0.82rem;
    padding: 0 0.4rem;
  }

  .transcript {
    max-height: min(42vh, 22rem);
    overflow-y: auto;
    border: 1px solid #2a2f3a;
    border-top: 1px solid #2a2f3a;
    border-radius: 0 0 12px 12px;
    padding: 0.55rem 0.85rem 0.65rem;
    background-color: rgb(0 0 0 / 0.45);
    box-shadow: 0 18px 40px rgb(0 0 0 / 0.25);
    scrollbar-color: #000 transparent;
    scrollbar-width: auto;
  }

  .transcript::-webkit-scrollbar {
    width: 12px;
  }

  .transcript::-webkit-scrollbar-track,
  .transcript::-webkit-scrollbar-corner {
    background: transparent;
  }

  .transcript::-webkit-scrollbar-thumb {
    background: #000;
  }

  .transcript::-webkit-scrollbar-button {
    display: block;
    height: 12px;
    background-color: transparent;
    background-repeat: no-repeat;
    background-position: center;
  }

  .transcript::-webkit-scrollbar-button:vertical:decrement {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10'%3E%3Cpolygon points='5,2 9,8 1,8' fill='%23000'/%3E%3C/svg%3E");
  }

  .transcript::-webkit-scrollbar-button:vertical:increment {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10'%3E%3Cpolygon points='1,2 9,2 5,8' fill='%23000'/%3E%3C/svg%3E");
  }

  .line {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    font: inherit;
    font-size: 0.78rem;
    line-height: 1.45;
    color: #c5cad3;
  }

  .line--err {
    color: #ff7676;
  }

  .line--warn {
    color: #f0c674;
  }

  .line--info {
    color: #8ab4f8;
  }

  .line--prompt {
    color: #e2e4ea;
    font-weight: 600;
    margin-top: 0.35rem;
  }

  .line--prompt:first-child {
    margin-top: 0;
  }

  .hint {
    margin: 0.45rem 0 0;
    color: #6a7384;
    font-size: 0.72rem;
    letter-spacing: 0.03em;
    padding: 0 0.4rem;
  }
</style>
