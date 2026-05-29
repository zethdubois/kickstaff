<script lang="ts">
  import { onMount, tick } from "svelte";
  import {
    devConsole,
    KAM_CONSOLE_FOCUS_INPUT_EVENT,
  } from "./state.svelte";
  import {
    focusStack,
    Z_CONSOLE_BASE,
    Z_CONSOLE_TOP,
  } from "$lib/client/focusStack.svelte";
  import {
    handleHistoryKeydown,
    resetHistoryNavigation,
  } from "./commandHistory";
  import { runCommand } from "./commands";
  import KickagentListFilters from "$lib/kickagent/KickagentListFilters.svelte";
  import KickagentResourceTable from "$lib/kickagent/KickagentResourceTable.svelte";
  import { getUnitsListSchema } from "$lib/kickagent/manifestResourceCache";
  import { UNITS_LIST_COMMAND } from "$lib/kickagent/unitsOps";

  let bodyEl: HTMLDivElement | undefined = $state();
  let inlineInput = $state("");
  let inlineInputEl: HTMLInputElement | undefined = $state();

  const promptPrefix = $derived(
    devConsole.kickagentModeActive ? "[KA] >" : "›",
  );

  const promptAriaLabel = $derived(
    devConsole.kickagentModeActive
      ? "KAM command input, kickagent mode active"
      : "KAM command input",
  );

  const placeholder = $derived(
    devConsole.kickagentModeActive
      ? "hello · :help · :exit"
      : "help · history · ↑↓ recall · Ctrl+/ palette",
  );

  const unitsListSchema = $derived(
    devConsole.kickagentModeActive ? getUnitsListSchema() : null,
  );

  async function runUnitsListFromConsole(args: string[]) {
    const parts = [UNITS_LIST_COMMAND, ...args];
    await runCommand(parts.join(" "));
  }

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
    focusStack.reset();
  }

  const consoleOnTop = $derived(
    !devConsole.consoleOpen || focusStack.activeLayer === "console",
  );

  function onConsoleInteract() {
    focusStack.focusConsole();
  }

  onMount(() => {
    resetHistoryNavigation();
    function onFocusConsoleInput() {
      focusStack.focusConsole();
      resetHistoryNavigation();
      void tick().then(() => inlineInputEl?.focus());
    }
    window.addEventListener(KAM_CONSOLE_FOCUS_INPUT_EVENT, onFocusConsoleInput);
    return () =>
      window.removeEventListener(
        KAM_CONSOLE_FOCUS_INPUT_EVENT,
        onFocusConsoleInput,
      );
  });
</script>

{#if devConsole.consoleOpen}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <aside
    class="kamConsole"
    aria-label="KAM Console"
    style:z-index={consoleOnTop ? Z_CONSOLE_TOP : Z_CONSOLE_BASE}
    onfocusin={onConsoleInteract}
    onpointerdown={onConsoleInteract}
  >
    <header
      class="head"
      class:head--kickagent={devConsole.kickagentModeActive}
    >
      <div class="headMain">
        <span class="title">KAM Console</span>
        {#if devConsole.dbStatus}
          <span
            class="dbBadge"
            class:dbBadge--prod={devConsole.dbStatus.target === "prod"}
            title={devConsole.dbStatus.label}
          >
            {devConsole.dbStatus.target}
          </span>
        {/if}
      </div>
      <button
        type="button"
        class="close"
        onclick={close}
        aria-label="Close console">×</button
      >
    </header>

    <div class="body" bind:this={bodyEl}>
      {#if unitsListSchema}
        <KickagentListFilters
          variant="console"
          schema={unitsListSchema}
          onRun={runUnitsListFromConsole}
        />
      {/if}
      {#if devConsole.tableOutcome}
        <KickagentResourceTable
          variant="console"
          model={devConsole.tableOutcome}
          title="Units"
        />
      {/if}
      {#each devConsole.entries as entry (entry.id)}
        <div
          class="row"
          class:row--err={entry.level === "error"}
          class:row--warn={entry.level === "warn"}
          class:row--info={entry.level === "info"}
          class:row--prompt={entry.source === "kam:prompt"}
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

    <form
      class="prompt"
      class:prompt--kickagent={devConsole.kickagentModeActive}
      aria-label={promptAriaLabel}
      onsubmit={submit}
    >
      <span class="caret" class:caret--kickagent={devConsole.kickagentModeActive} aria-hidden="true"
        >{promptPrefix}</span
      >
      <input
        bind:this={inlineInputEl}
        bind:value={inlineInput}
        {placeholder}
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
        onkeydown={(e) => {
          handleHistoryKeydown(e, inlineInput, (v) => {
            inlineInput = v;
          });
        }}
      />
    </form>
  </aside>
{/if}

<style>
  .kamConsole {
    position: fixed;
    top: var(--site-header-offset, 0px);
    left: 0;
    bottom: 0;
    width: min(420px, 90vw);
    background: #0b0d11;
    color: #d6d8de;
    border-right: 1px solid #2a2f3a;
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

  .head--kickagent {
    border-left: 3px solid #62d4a3;
    background: #0f1512;
  }

  .headMain {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
  }

  .title {
    font-weight: 600;
    letter-spacing: 0.06em;
    font-size: 0.78rem;
    color: #9aa3b3;
    text-transform: uppercase;
  }

  .dbBadge {
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    padding: 0.12rem 0.4rem;
    border-radius: 4px;
    background: #1a2a3d;
    color: #8ab4f8;
    border: 1px solid #2a4a6a;
    max-width: 12rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .dbBadge--prod {
    background: #3a2218;
    color: #f0a060;
    border-color: #6a4020;
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

  .row--prompt .msg {
    color: #e2e4ea;
    font-weight: 600;
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

  .prompt--kickagent {
    border-left: 3px solid #62d4a3;
    background: #0f1512;
  }

  .caret {
    color: #9aa3b3;
    font-weight: 700;
    white-space: pre;
  }

  .caret--kickagent {
    color: #62d4a3;
    letter-spacing: 0.04em;
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
