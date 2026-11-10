<script lang="ts">
  import { onMount, tick } from "svelte";
  import { devConsole, CONSOLE_FOCUS_INPUT_EVENT } from "./state.svelte";
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
  import { showsKlogTimestamp } from "./klogStamp";
  import {
    getShowTimestamps,
    setShowTimestamps,
  } from "$lib/client/consoleUi.svelte";
  import KickagentListFilters from "$lib/kickagent/KickagentListFilters.svelte";
  import { getUnitsListSchema } from "$lib/kickagent/manifestResourceCache";
  import StoreTree from "./StoreTree.svelte";
  import WritesLog from "./WritesLog.svelte";

  let bodyEl: HTMLDivElement | undefined = $state();
  let view = $state<"console" | "stores" | "writes">("console");
  let inlineInput = $state("");
  let inlineInputEl: HTMLInputElement | undefined = $state();
  /** Shared with Klio (`kickstaff.consoleUi.showTimestamps`). Default off. */
  const showTimestamps = $derived(getShowTimestamps());

  const promptPrefix = $derived(
    devConsole.activeNamespace === "klio"
      ? "[Klio] >"
      : devConsole.kickagentModeActive
        ? "[KA] >"
        : "›",
  );

  const promptAriaLabel = $derived(
    devConsole.kickagentModeActive
      ? "Command input, kickagent mode active"
      : "Command input",
  );

  const placeholder = $derived(
    devConsole.activeNamespace === "klio"
      ? "ask · ? · :exit"
      : devConsole.kickagentModeActive
        ? "hello · :help · :exit"
        : "help · history · ↑↓ recall · (`) toggles console",
  );

  const unitsListSchema = $derived(
    devConsole.kickagentModeActive ? getUnitsListSchema() : null,
  );

  async function runUnitsListFromConsole(args: string[]) {
    const command = getUnitsListSchema()?.command;
    if (!command) return;
    await runCommand([command, ...args].join(" "));
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

  function toggleTimestamps() {
    setShowTimestamps(!showTimestamps);
  }

  function toggleStores() {
    view = view === "stores" ? "console" : "stores";
  }

  function toggleWrites() {
    view = view === "writes" ? "console" : "writes";
  }

  onMount(() => {
    resetHistoryNavigation();
    function onFocusConsoleInput() {
      focusStack.focusConsole();
      resetHistoryNavigation();
      void tick().then(() => inlineInputEl?.focus());
    }
    window.addEventListener(CONSOLE_FOCUS_INPUT_EVENT, onFocusConsoleInput);
    return () =>
      window.removeEventListener(
        CONSOLE_FOCUS_INPUT_EVENT,
        onFocusConsoleInput,
      );
  });
</script>

{#if devConsole.consoleOpen}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <aside
    class="consolePane"
    aria-label="Console"
    style:z-index={consoleOnTop ? Z_CONSOLE_TOP : Z_CONSOLE_BASE}
    onfocusin={onConsoleInteract}
    onpointerdown={onConsoleInteract}
  >
    <header class="head" class:head--kickagent={devConsole.kickagentModeActive}>
      <button
        type="button"
        class="close"
        onclick={close}
        aria-label="Close console">×</button
      >
      <div class="headMain">
        <span class="title">Console</span>
        {#if devConsole.dbStatus}
          <span
            class="dbBadge"
            class:dbBadge--staging={devConsole.dbStatus.target === "staging"}
            class:dbBadge--prod={devConsole.dbStatus.target === "prod"}
            title={devConsole.dbStatus.label}
          >
            {devConsole.dbStatus.target}
          </span>
        {/if}
        <div class="headTools">
          <button
            type="button"
            class="stampToggle"
            class:stampToggle--on={view === "writes"}
            aria-pressed={view === "writes"}
            aria-label={view === "writes" ? "Show console" : "Show writes"}
            title={view === "writes" ? "Show console" : "Show writes"}
            onclick={toggleWrites}>{view === "writes" ? "console" : "writes"}</button
          >
          <button
            type="button"
            class="stampToggle"
            class:stampToggle--on={view === "stores"}
            aria-pressed={view === "stores"}
            aria-label={view === "stores" ? "Show console" : "Show stores"}
            title={view === "stores" ? "Show console" : "Show stores"}
            onclick={toggleStores}>{view === "stores" ? "console" : "stores"}</button
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
      </div>
    </header>

    <div class="body" bind:this={bodyEl}>
      {#if view === "stores"}
        <StoreTree />
      {:else if view === "writes"}
        <WritesLog />
      {:else}
      <div class="bodyContent" class:bodyContent--stamps={showTimestamps}>
        {#if unitsListSchema}
          <KickagentListFilters
            variant="console"
            filters={unitsListSchema.filters}
            command={unitsListSchema.command}
            commandLabel={unitsListSchema.label}
            onRun={runUnitsListFromConsole}
          />
        {/if}
        {#each devConsole.entries as entry, i (entry.id)}
          {@const previous = i > 0 ? devConsole.entries[i - 1] : null}
          <div
            class="row"
            class:row--stamps={showTimestamps}
            class:row--err={entry.level === "error"}
            class:row--warn={entry.level === "warn"}
            class:row--info={entry.level === "info"}
            class:row--prompt={entry.source === "host:prompt"}
            title={fmtTs(entry.ts)}
          >
            {#if showTimestamps}
              <span class="ts"
                >{showsKlogTimestamp(entry, previous)
                  ? fmtTs(entry.ts)
                  : ""}</span
              >
            {/if}
            <pre class="msg">{entry.message}</pre>
          </div>
        {:else}
          <p class="empty">
            no klogs yet — call <code>klog(...)</code> from anywhere in client code
            to print here.
          </p>
        {/each}
      </div>
      {/if}
    </div>

    {#if view === "console"}
    <form
      class="prompt"
      class:prompt--kickagent={devConsole.kickagentModeActive}
      aria-label={promptAriaLabel}
      onsubmit={submit}
    >
      <span
        class="caret"
        class:caret--kickagent={devConsole.kickagentModeActive}
        aria-hidden="true">{promptPrefix}</span
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
    {/if}
  </aside>
{/if}

<style>
  .consolePane {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: var(--console-width, min(370px, 90vw));
    background: #0b0d11;
    color: #d6d8de;
    border-right: 1px solid #2a2f3a;
    display: grid;
    grid-template-rows: auto 1fr auto;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.9rem;
    box-shadow: 8px 0 30px rgba(0, 0, 0, 0.35);
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

  .head--kickagent {
    border-left: 3px solid #62d4a3;
    background: #0f1512;
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

  .dbBadge {
    font-size: 0.58rem;
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

  .dbBadge--staging {
    background: #2a2818;
    color: #d4c05a;
    border-color: #5a5020;
  }

  .dbBadge--prod {
    background: #3a2218;
    color: #f0a060;
    border-color: #6a4020;
  }

  .headTools {
    margin-left: auto;
    display: flex;
    gap: 0.35rem;
    flex: 0 0 auto;
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
    row-gap: 0.3rem;
    /* Collapsed clock column still reserves a slim gutter so the log is not flush. */
    padding: 0.4rem 0.5rem 0.4rem 10px;
    min-height: 100%;
  }

  .bodyContent--stamps {
    padding-left: 5px;
  }

  .row {
    border-radius: 3px;
  }

  .row--stamps {
    display: grid;
    /* 8ch fits HH:MM:SS; empty timestamps still reserve the column. */
    grid-template-columns: 8ch 1fr;
    column-gap: 0.5rem;
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
    font-size: 0.7rem;
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
    font-size: 0.72rem;
  }
</style>
