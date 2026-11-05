<!--
  @docs: docs/sop-svelte-and-components.md
  @component: KlioPanel.svelte
  @faq: docs/guides/KlioPanel.md
-->
<script lang="ts">
  import { onMount, tick } from "svelte";
  import { KLIO_FOCUS_INPUT_EVENT, klio } from "./state.svelte";

  let { enabled }: { enabled: boolean } = $props();

  let input = $state("");
  let inputEl = $state<HTMLInputElement | undefined>(undefined);
  let bodyEl = $state<HTMLDivElement | undefined>(undefined);

  $effect(() => {
    if (!enabled && klio.open) klio.close();
  });

  $effect(() => {
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

  function submit(e: SubmitEvent) {
    e.preventDefault();
    klio.send(input);
    input = "";
    void tick().then(() => inputEl?.focus());
  }
</script>

{#if enabled && klio.open}
  <aside class="klioPane" aria-label="Klio">
    <header class="head">
      <button type="button" class="close" onclick={() => klio.close()} aria-label="Close Klio"
        >×</button>
      <span class="title">Klio</span>
    </header>
    <div class="body" bind:this={bodyEl}>
      {#each klio.lines as line (line.id)}
        <p class="line" class:line--user={line.role === "user"}>
          <span class="who">{line.role === "user" ? "You" : "Klio"}</span>
          <span class="text">{line.text}</span>
        </p>
      {/each}
    </div>
    <form class="prompt" onsubmit={submit}>
      <input
        bind:this={inputEl}
        bind:value={input}
        type="text"
        placeholder="Message Klio"
        aria-label="Message Klio"
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
    gap: 0.35rem;
    padding: 0.35rem 0.75rem 0.35rem 0.2rem;
    border-bottom: 1px solid #1d2129;
    background: #0f1218;
  }

  .close {
    appearance: none;
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

  .title {
    font-weight: 600;
    letter-spacing: 0.02em;
  }

  .body {
    overflow-y: auto;
    padding: 0.6rem 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
  }

  .line {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .who {
    font-size: 0.68rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #8ab4f8;
  }

  .line--user .who {
    color: #9aa3b3;
  }

  .text {
    white-space: pre-wrap;
    word-break: break-word;
    line-height: 1.45;
  }

  .prompt {
    border-top: 1px solid #1d2129;
    padding: 0.45rem 0.6rem;
  }

  .prompt input {
    width: 100%;
    box-sizing: border-box;
    background: transparent;
    color: inherit;
    border: 0;
    outline: none;
    font: inherit;
    padding: 0.35rem 0.2rem;
  }
</style>
