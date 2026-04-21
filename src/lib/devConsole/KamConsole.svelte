<script lang="ts">
  import { devConsole } from "./state.svelte";
  import { runCommand } from "./commands";

  let bodyEl: HTMLDivElement | undefined = $state();
  let inlineInput = $state("");

  $effect(() => {
    if (!bodyEl) return;
    void devConsole.entries.length;
    queueMicrotask(() => {
      if (bodyEl) bodyEl.scrollTop = bodyEl.scrollHeight;
    });
  });

  function fmtTs(ts: number): string {
    return new Date(ts).toTimeString().slice(0, 8);
  }

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    const cmd = inlineInput.trim();
    if (!cmd) return;
    inlineInput = "";
    await runCommand(cmd);
  }

  function close() {
    devConsole.consoleOpen = false;
  }
</script>

{#if devConsole.consoleOpen}
  <aside class="kamConsole" aria-label="KAM Console">
    <header class="head">
      <span class="title">KAM Console</span>
      <button
        type="button"
        class="close"
        onclick={close}
        aria-label="Close console">×</button
      >
    </header>

    <div class="body" bind:this={bodyEl}>
      {#each devConsole.entries as entry (entry.id)}
        <div
          class="row"
          class:row--err={entry.level === "error"}
          class:row--warn={entry.level === "warn"}
          class:row--info={entry.level === "info"}
        >
          <span class="ts">{fmtTs(entry.ts)}</span>
          <pre class="msg">{entry.message}</pre>
        </div>
      {:else}
        <p class="empty">
          no klogs yet — call <code>klog(...)</code> from anywhere in client
          code to print here.
        </p>
      {/each}
    </div>

    <form class="prompt" onsubmit={submit}>
      <span class="caret" aria-hidden="true">›</span>
      <input
        bind:value={inlineInput}
        placeholder="run a command (try: help, reset --all-parsed)"
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
      />
    </form>
  </aside>
{/if}

<style>
  .kamConsole {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: min(420px, 90vw);
    background: #0b0d11;
    color: #d6d8de;
    border-right: 1px solid #2a2f3a;
    z-index: 900;
    display: grid;
    grid-template-rows: auto 1fr auto;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    box-shadow: 8px 0 30px rgba(0, 0, 0, 0.35);
  }

  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid #1d2129;
    background: #0f1218;
  }

  .title {
    font-weight: 600;
    letter-spacing: 0.06em;
    font-size: 0.78rem;
    color: #9aa3b3;
    text-transform: uppercase;
  }

  .close {
    appearance: none;
    background: transparent;
    color: #9aa3b3;
    border: 0;
    font-size: 1.15rem;
    line-height: 1;
    cursor: pointer;
    padding: 0.15rem 0.45rem;
    border-radius: 4px;
  }

  .close:hover {
    background: #1a1f29;
    color: #fff;
  }

  .body {
    overflow-y: auto;
    padding: 0.4rem 0.5rem;
    font-size: 0.78rem;
    line-height: 1.45;
  }

  .row {
    display: grid;
    grid-template-columns: 4.4rem 1fr;
    gap: 0.4rem;
    padding: 0.1rem 0.15rem;
    border-radius: 3px;
  }

  .row:hover {
    background: #131822;
  }

  .row--err .msg {
    color: #ff7676;
  }

  .row--warn .msg {
    color: #f0c674;
  }

  .row--info .msg {
    color: #8ab4f8;
  }

  .ts {
    color: #5a6373;
    font-variant-numeric: tabular-nums;
  }

  .msg {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: inherit;
    color: inherit;
  }

  .empty {
    color: #5a6373;
    padding: 0.6rem 0.4rem;
    font-size: 0.8rem;
    line-height: 1.5;
  }

  .empty code {
    background: #1a1f29;
    padding: 1px 5px;
    border-radius: 3px;
    color: #d6d8de;
  }

  .prompt {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 0.4rem;
    padding: 0.45rem 0.6rem;
    border-top: 1px solid #1d2129;
    background: #0f1218;
  }

  .caret {
    color: #62d4a3;
    font-weight: 700;
  }

  .prompt input {
    width: 100%;
    appearance: none;
    background: transparent;
    border: 0;
    color: inherit;
    outline: none;
    font: inherit;
    font-size: 0.82rem;
  }
</style>
