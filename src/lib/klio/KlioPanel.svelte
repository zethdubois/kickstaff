<!--
  @docs: docs/sop-svelte-and-components.md
  @component: KlioPanel.svelte
  @faq: docs/guides/KlioPanel.md
-->
<script lang="ts">
  import { onMount, tick } from "svelte";
  import {
    getShowTimestamps,
    setShowTimestamps,
  } from "$lib/client/consoleUi.svelte";
  import { KLIO_FOCUS_INPUT_EVENT, klio } from "./state.svelte";

  let { enabled }: { enabled: boolean } = $props();

  let input = $state("");
  let inputEl = $state<HTMLInputElement | undefined>(undefined);
  let bodyEl = $state<HTMLDivElement | undefined>(undefined);
  /** Shared with the console (`kickstaff.consoleUi.showTimestamps`). */
  const showTimestamps = $derived(getShowTimestamps());

  $effect(() => {
    if (!enabled && klio.open) klio.close();
  });

  $effect(() => {
    const last = klio.lines.at(-1);
    last?.text;
    klio.lines.length;
    void tick().then(() => {
      bodyEl?.scrollTo({ top: bodyEl.scrollHeight });
    });
  });

  function isTypingTarget(e: KeyboardEvent): boolean {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return false;
    if (target.isContentEditable) return true;
    const tag = target.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
  }

  function onKey(e: KeyboardEvent) {
    if (!enabled || e.repeat) return;
    if (e.key !== "]" || e.altKey) return;
    const chord = e.ctrlKey || e.metaKey;
    if (!chord && isTypingTarget(e)) return;
    e.preventDefault();
    e.stopPropagation();
    klio.toggle();
  }

  function fmtTs(ts: number): string {
    return new Date(ts).toTimeString().slice(0, 8);
  }

  function toggleTimestamps() {
    setShowTimestamps(!showTimestamps);
  }

  onMount(() => {
    function onFocus() {
      void tick().then(() => inputEl?.focus());
    }
    document.addEventListener("keydown", onKey, true);
    window.addEventListener(KLIO_FOCUS_INPUT_EVENT, onFocus);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener(KLIO_FOCUS_INPUT_EVENT, onFocus);
    };
  });

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    const text = input;
    input = "";
    await klio.send(text);
    void tick().then(() => inputEl?.focus());
  }
</script>

{#if enabled && klio.open}
  <aside class="klioPane" aria-label="Klio">
    <header class="head">
      <button
        type="button"
        class="close"
        onclick={() => klio.close()}
        aria-label="Close Klio">×</button
      >
      <div class="headMain">
        <span class="title">Klio</span>
        <button
          type="button"
          class="newChat"
          aria-label="New chat"
          title="New chat"
          disabled={klio.pending}
          onclick={() => {
            klio.newChat();
            input = "";
            void tick().then(() => inputEl?.focus());
          }}>+new</button
        >
        <button
          type="button"
          class="stampToggle"
          class:stampToggle--on={showTimestamps}
          aria-pressed={showTimestamps}
          aria-label="Show timestamps"
          title={showTimestamps ? "Hide timestamps" : "Show timestamps"}
          onclick={toggleTimestamps}>time</button
        >
      </div>
    </header>
    <div class="body" bind:this={bodyEl}>
      <div class="bodyContent" class:bodyContent--stamps={showTimestamps}>
        {#each klio.lines as line (line.id)}
          <div
            class="row"
            class:row--stamps={showTimestamps}
            title={fmtTs(line.ts)}
          >
            {#if showTimestamps}
              <span class="ts">{fmtTs(line.ts)}</span>
            {/if}
            <div
              class="bubble"
              class:bubble--user={line.role === "user"}
              class:bubble--klio={line.role === "klio"}
              aria-label={line.role === "user" ? "You" : "Klio"}
            >
              <pre class="text">{line.text}</pre>
            </div>
          </div>
        {/each}
      </div>
    </div>
    <form class="prompt" onsubmit={submit}>
      <input
        bind:this={inputEl}
        bind:value={input}
        type="text"
        placeholder="Message Klio"
        aria-label="Message Klio"
        disabled={klio.pending}
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
      />
    </form>
  </aside>
{/if}

<style>
  .klioPane {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: var(--klio-width, min(370px, 90vw));
    background: #0b0d11;
    color: #d6d8de;
    border-left: 1px solid #2a2f3a;
    display: grid;
    grid-template-rows: auto 1fr auto;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.9rem;
    box-shadow: -8px 0 30px rgba(0, 0, 0, 0.35);
    z-index: 1;
  }

  .head {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 0.35rem;
    padding: 0.35rem 0.75rem 0.35rem 0.2rem;
    border-bottom: 1px solid #1d2129;
    background: #0f1218;
  }

  .headMain {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    min-width: 0;
  }

  .title {
    font-weight: 600;
    letter-spacing: 0.06em;
    font-size: 0.68rem;
    color: #9aa3b3;
    text-transform: uppercase;
  }

  .newChat {
    appearance: none;
    margin-left: auto;
    font: inherit;
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: lowercase;
    padding: 0.12rem 0.4rem;
    border-radius: 4px;
    background: transparent;
    color: #9aa3b3;
    border: 1px solid #2a2f3a;
    cursor: pointer;
  }

  .newChat:hover:not(:disabled) {
    background: #1a1f29;
    color: #fff;
    border-color: #3a4254;
  }

  .newChat:disabled {
    opacity: 0.45;
    cursor: wait;
  }

  .stampToggle {
    appearance: none;
    font: inherit;
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    padding: 0.12rem 0.4rem;
    border-radius: 4px;
    background: transparent;
    color: #6a7384;
    border: 1px solid #2a2f3a;
    cursor: pointer;
  }

  .stampToggle--on {
    background: #1a2a3d;
    color: #8ab4f8;
    border-color: #2a4a6a;
  }

  .close {
    appearance: none;
    flex: 0 0 auto;
    background: transparent;
    color: #9aa3b3;
    border: 0;
    font-size: 1.05rem;
    line-height: 1;
    cursor: pointer;
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
  }

  .close:hover {
    background: #1a1f29;
    color: #fff;
  }

  .body {
    overflow-y: auto;
    scrollbar-color: #3a4254 #0b0d11;
    font-size: 0.68rem;
    line-height: 1.45;
  }

  .body::-webkit-scrollbar {
    width: 10px;
  }

  .body::-webkit-scrollbar-track {
    background: #0b0d11;
  }

  .body::-webkit-scrollbar-thumb {
    background: #3a4254;
    border-radius: 4px;
  }

  .bodyContent {
    display: flex;
    flex-direction: column;
    row-gap: 0.45rem;
    /* Collapsed clock column still reserves a slim gutter so the log is not flush. */
    padding: 0.4rem 0.5rem 0.4rem 10px;
    min-height: 100%;
  }

  .bodyContent--stamps {
    padding-left: 5px;
  }

  .row {
    min-width: 0;
  }

  .row--stamps {
    display: grid;
    /* 8ch fits HH:MM:SS; empty timestamps still reserve the column. */
    grid-template-columns: 8ch 1fr;
    column-gap: 0.5rem;
    align-items: start;
  }

  .ts {
    color: #5a6373;
    font-variant-numeric: tabular-nums;
    padding-top: 0.35rem;
  }

  .bubble {
    min-width: 0;
    padding: 0.4rem 0.55rem;
    border-radius: 6px;
    border: 1px solid transparent;
    border-left-width: 3px;
  }

  /* Cool slate — your turns. */
  .bubble--user {
    background: #16181e;
    border-color: #2e3340;
    border-left-color: #7a8496;
    color: #c5cad3;
  }

  /* Blue-green wash — Klio's replies. */
  .bubble--klio {
    background: #0d1818;
    border-color: #1e3a36;
    border-left-color: #62d4a3;
    color: #d4ebe0;
  }

  .text {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: inherit;
    color: inherit;
  }

  .prompt {
    border-top: 1px solid #1d2129;
    padding: 0.45rem 0.6rem;
    background: #0f1218;
  }

  .prompt input {
    width: 100%;
    box-sizing: border-box;
    background: transparent;
    color: inherit;
    border: 0;
    outline: none;
    font: inherit;
    font-size: 0.72rem;
    padding: 0.35rem 0.2rem;
  }
</style>
