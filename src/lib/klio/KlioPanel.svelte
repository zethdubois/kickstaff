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
  import { callLine, resultText } from "./plan";
  import { KLIO_FOCUS_INPUT_EVENT, klio } from "./state.svelte";

  let { enabled }: { enabled: boolean } = $props();

  type ChatSummary = { id: string; title: string; createdAt: number; open: boolean };
  type SavedPlan = { id: string; title: string; proposedAt: number };
  type ListRow = { kind: "chat" | "plan"; id: string; title: string; at: number };

  let input = $state("");
  let inputEl = $state<HTMLInputElement | undefined>(undefined);
  let bodyEl = $state<HTMLDivElement | undefined>(undefined);
  /** Local only. Not written to the transcript. */
  let notice = $state<string | null>(null);
  let showChats = $state(false);
  let chats = $state<ListRow[]>([]);
  let chatsLoading = $state(false);
  /** Shared with the console (`kickstaff.consoleUi.showTimestamps`). */
  const showTimestamps = $derived(getShowTimestamps());

  $effect(() => {
    if (!enabled && klio.open) klio.close();
  });

  $effect(() => {
    const last = klio.lines.at(-1);
    last?.text;
    klio.lines.length;
    klio.plan;
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

  function isChatSummary(value: unknown): value is ChatSummary {
    if (!value || typeof value !== "object") return false;
    const row = value as Record<string, unknown>;
    return typeof row.id === "string" && typeof row.title === "string";
  }

  function isSavedPlan(value: unknown): value is SavedPlan {
    if (!value || typeof value !== "object") return false;
    const row = value as Record<string, unknown>;
    return typeof row.id === "string" && typeof row.title === "string";
  }

  async function loadChats() {
    chatsLoading = true;
    try {
      const res = await fetch("/api/klio/chats");
      if (!res.ok) {
        chats = [];
        return;
      }
      const body = (await res.json()) as { chats?: unknown; plans?: unknown };
      const threads: ListRow[] = Array.isArray(body.chats)
        ? body.chats.filter(isChatSummary).map((chat) => ({
            kind: "chat" as const,
            id: chat.id,
            title: chat.title,
            at: chat.createdAt,
          }))
        : [];
      const plans: ListRow[] = Array.isArray(body.plans)
        ? body.plans.filter(isSavedPlan).map((plan) => ({
            kind: "plan" as const,
            id: plan.id,
            title: plan.title,
            at: plan.proposedAt,
          }))
        : [];
      chats = [...threads, ...plans].sort((a, b) => b.at - a.at);
    } catch {
      chats = [];
    } finally {
      chatsLoading = false;
    }
  }

  async function toggleChats() {
    showChats = !showChats;
    if (showChats) await loadChats();
  }

  async function startNewChat() {
    notice = "new chat";
    showChats = false;
    input = "";
    await klio.newChat();
    void tick().then(() => inputEl?.focus());
  }

  async function pickPlan(id: string) {
    const ok = await klio.openPlan(id);
    if (!ok) {
      await loadChats();
      return;
    }
    notice = null;
    showChats = false;
    void tick().then(() => inputEl?.focus());
  }

  async function removePlan(id: string) {
    const res = await fetch("/api/klio/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "dismiss" }),
    });
    if (!res.ok) return;
    await loadChats();
  }

  async function pickChat(id: string) {
    const ok = await klio.openChat(id);
    if (!ok) {
      await loadChats();
      return;
    }
    notice = null;
    showChats = false;
    void tick().then(() => inputEl?.focus());
  }

  async function removeChat(id: string) {
    const res = await fetch("/api/klio/chats", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) return;
    const body = (await res.json()) as { wasOpen?: boolean };
    if (body.wasOpen) {
      notice = null;
      klio.clearTranscript();
    }
    await loadChats();
  }

  onMount(() => {
    if (klio.open) void klio.hydrate();
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
    notice = null;
    showChats = false;
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
      <span class="title">Klio</span>
      <div class="headActions">
        <button
          type="button"
          class="headAction"
          aria-label="New chat"
          title="New chat"
          disabled={klio.pending}
          onclick={startNewChat}>+new</button
        >
        <button
          type="button"
          class="headAction"
          class:headAction--on={showChats}
          aria-pressed={showChats}
          aria-label="Saved chats"
          title="Saved chats"
          disabled={klio.pending}
          onclick={toggleChats}>chats</button
        >
      </div>
      <button
        type="button"
        class="stampToggle"
        class:stampToggle--on={showTimestamps}
        aria-pressed={showTimestamps}
        aria-label="Show timestamps"
        title={showTimestamps ? "Hide timestamps" : "Show timestamps"}
        onclick={toggleTimestamps}>time</button
      >
    </header>
    <div class="body" bind:this={bodyEl}>
      {#if showChats}
        <div class="chatList" aria-label="Saved chats">
          {#if chatsLoading}
            <p class="status">loading</p>
          {:else if chats.length === 0}
            <p class="status">no saved chats</p>
          {:else}
            {#each chats as chat (`${chat.kind}-${chat.id}`)}
              <div class="chatRow">
                <button
                  type="button"
                  class="chatOpen"
                  class:chatOpen--plan={chat.kind === "plan"}
                  onclick={() =>
                    chat.kind === "plan" ? pickPlan(chat.id) : pickChat(chat.id)}
                  >{chat.title}</button
                >
                <button
                  type="button"
                  class="chatDelete"
                  aria-label={chat.kind === "plan" ? "Remove saved plan" : "Delete chat"}
                  onclick={() =>
                    chat.kind === "plan" ? removePlan(chat.id) : removeChat(chat.id)}
                  >del</button
                >
              </div>
            {/each}
          {/if}
        </div>
      {:else}
      <div class="bodyContent" class:bodyContent--stamps={showTimestamps}>
        {#if notice}
          <p class="status">{notice}</p>
        {/if}
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
        {#if klio.plan}
          <section class="plan" aria-label={klio.plan.title}>
            <div class="planHead">
              <span class="planTitle">{klio.plan.title}</span>
              <time class="planWhen" datetime={new Date(klio.plan.proposedAt).toISOString()}
                >{new Date(klio.plan.proposedAt).toLocaleString()}</time
              >
            </div>
            <ul class="planCalls">
              {#each klio.plan.calls as call, i (i)}
                <li>{callLine(call)}</li>
              {/each}
            </ul>
            {#if klio.plan.status === "executed"}
              <div class="planLogs">
                {#each klio.plan.results ?? [] as result, i (i)}
                  <pre class="planLog">{resultText(result)}</pre>
                {/each}
              </div>
            {:else}
              <div class="planActions">
                <button
                  type="button"
                  class="planButton planButton--confirm"
                  disabled={klio.pending || klio.acting}
                  onclick={() => klio.act("confirm")}>Confirm</button
                >
                <button
                  type="button"
                  class="planButton"
                  disabled={klio.pending || klio.acting}
                  onclick={() => klio.act("save")}>Save</button
                >
                <button
                  type="button"
                  class="planButton"
                  disabled={klio.pending || klio.acting}
                  onclick={() => klio.act("cancel")}>Cancel</button
                >
              </div>
            {/if}
          </section>
        {/if}
      </div>
      {/if}
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
    gap: 0.35rem;
    padding: 0.35rem 0.75rem 0.35rem 0.2rem;
    border-bottom: 1px solid #1d2129;
    background: #0f1218;
  }

  .title {
    flex: 0 0 auto;
    font-weight: 600;
    letter-spacing: 0.06em;
    font-size: 0.68rem;
    color: #9aa3b3;
    text-transform: uppercase;
  }

  .headActions {
    display: flex;
    flex: 1;
    gap: 0.35rem;
    min-width: 0;
  }

  .headAction {
    appearance: none;
    flex: 1;
    min-width: 0;
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

  .headAction:hover:not(:disabled) {
    background: #1a1f29;
    color: #fff;
    border-color: #3a4254;
  }

  .headAction--on {
    background: #1a2a3d;
    color: #8ab4f8;
    border-color: #2a4a6a;
  }

  .headAction:disabled {
    opacity: 0.45;
    cursor: wait;
  }

  .status {
    margin: 0;
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: lowercase;
    color: #6a7384;
  }

  .chatList {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    padding: 0.4rem 0.5rem 0.4rem 10px;
  }

  .chatRow {
    display: flex;
    gap: 0.35rem;
    min-width: 0;
  }

  .chatOpen {
    appearance: none;
    flex: 1;
    min-width: 0;
    text-align: left;
    font: inherit;
    font-size: 0.68rem;
    padding: 0.4rem 0.55rem;
    border-radius: 4px;
    border: 1px solid #2a3548;
    background: #151a24;
    color: #d6d8de;
    cursor: pointer;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .chatOpen:hover {
    border-color: #3a4a62;
    background: #1a2230;
  }

  .chatOpen--plan {
    border-left: 3px solid #62d4a3;
  }

  .chatDelete {
    appearance: none;
    flex: 0 0 3.25rem;
    font: inherit;
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: lowercase;
    border-radius: 4px;
    border: 1px solid #4a3030;
    background: #241616;
    color: #e0a0a0;
    cursor: pointer;
  }

  .chatDelete:hover {
    background: #3a1c1c;
    color: #fff;
  }

  .plan {
    margin-top: 0.55rem;
    padding: 0.45rem 0.55rem;
    border: 1px solid #1e3a36;
    border-left: 3px solid #62d4a3;
    border-radius: 6px;
    background: #0d1818;
    color: #d4ebe0;
  }

  .planHead {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .planTitle {
    font-size: 0.68rem;
    font-weight: 700;
    min-width: 0;
  }

  .planWhen {
    flex: 0 0 auto;
    font-size: 0.58rem;
    color: #6a7384;
  }

  .planCalls {
    margin: 0.35rem 0 0;
    padding: 0;
    list-style: none;
    font-size: 0.64rem;
  }

  .planCalls li {
    padding: 0.15rem 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .planActions {
    display: flex;
    gap: 0.35rem;
    margin-top: 0.45rem;
  }

  .planButton {
    appearance: none;
    flex: 1;
    min-width: 0;
    font: inherit;
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    padding: 0.28rem 0.3rem;
    border-radius: 4px;
    border: 1px solid #2a2f3a;
    background: transparent;
    color: #9aa3b3;
    cursor: pointer;
  }

  .planButton:hover:not(:disabled) {
    background: #1a1f29;
    color: #fff;
  }

  .planButton--confirm {
    background: #143028;
    border-color: #1e3a36;
    color: #d4ebe0;
  }

  .planButton:disabled {
    opacity: 0.45;
    cursor: wait;
  }

  .planLogs {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    margin-top: 0.4rem;
  }

  .planLog {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    font: inherit;
    font-size: 0.62rem;
    color: #c5cad3;
  }

  .stampToggle {
    appearance: none;
    flex: 0 0 auto;
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
