<!--
  @docs: docs/guides/console.md
  @component: WritesLog.svelte
-->
<script lang="ts">
  import { runManifestCommand } from "$lib/kickagent/runManifestCommand";
  import { devConsole } from "./state.svelte";

  const PAGE = 20;

  type WriteRow = {
    createdAt: string;
    actorUserId: string | null;
    datasetName: string | null;
    command: string;
    args: string[];
    outcome: string;
    summary: string | null;
  };

  let offset = $state(0);
  let rows = $state<WriteRow[]>([]);
  let total = $state(0);
  let loading = $state(false);
  let error = $state("");
  let request = 0;
  let loadedFor = "";

  function isRow(value: unknown): value is WriteRow {
    if (!value || typeof value !== "object") return false;
    const row = value as Record<string, unknown>;
    return (
      typeof row.createdAt === "string" &&
      typeof row.command === "string" &&
      typeof row.outcome === "string" &&
      Array.isArray(row.args) &&
      row.args.every((arg) => typeof arg === "string")
    );
  }

  function logText(log: unknown): string {
    if (typeof log === "string") return log;
    if (Array.isArray(log)) return log.filter((line) => typeof line === "string").join("\n");
    return "could not load writes";
  }

  async function load(next: number) {
    const id = ++request;
    loading = true;
    error = "";
    try {
      const outcome = await runManifestCommand("write-audit-list", [
        "--limit",
        String(PAGE),
        "--offset",
        String(next),
      ]);
      if (id !== request) return;
      if (outcome.level === "error") {
        error = logText(outcome.log);
        rows = [];
        total = 0;
        return;
      }
      const data = outcome.data as { rows?: unknown; total?: unknown } | undefined;
      const parsed = Array.isArray(data?.rows) ? data.rows.filter(isRow) : [];
      rows = parsed;
      total = typeof data?.total === "number" ? data.total : parsed.length;
      offset = next;
    } catch (err) {
      if (id !== request) return;
      error = err instanceof Error ? err.message : String(err);
      rows = [];
      total = 0;
    } finally {
      if (id === request) loading = false;
    }
  }

  $effect(() => {
    const target = devConsole.dbStatus?.target ?? "";
    if (!target || target === loadedFor) return;
    loadedFor = target;
    void load(0);
  });

  const from = $derived(total === 0 ? 0 : offset + 1);
  const to = $derived(offset + rows.length);
</script>

<div class="writes">
  <div class="pager">
    <button
      type="button"
      disabled={loading || offset === 0}
      onclick={() => load(Math.max(0, offset - PAGE))}>newer</button
    >
    <span>{loading && rows.length === 0 ? "loading" : `${from}–${to} of ${total}`}</span>
    <button
      type="button"
      disabled={loading || offset + PAGE >= total}
      onclick={() => load(offset + PAGE)}>older</button
    >
  </div>
  {#if error}
    <p class="err">{error}</p>
  {:else if !devConsole.dbStatus}
    <p class="empty">loading</p>
  {:else if loading && rows.length === 0}
    <p class="empty">loading</p>
  {:else if rows.length === 0}
    <p class="empty">no writes yet</p>
  {:else}
    <ul>
      {#each rows as row, i (`${offset}-${i}`)}
        <li class:err={row.outcome === "error"}>
          <div class="meta">
            <time datetime={row.createdAt}>{new Date(row.createdAt).toLocaleString()}</time>
            <span class="outcome">{row.outcome}</span>
          </div>
          <div class="call">{[row.command, ...row.args].join(" ")}</div>
          {#if row.summary}
            <div class="summary">{row.summary}</div>
          {/if}
          <div class="actor">{row.actorUserId ?? "—"}</div>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .writes {
    padding: 0.4rem 0.5rem 0.6rem 10px;
    font-size: 0.68rem;
    line-height: 1.4;
  }

  .pager {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin-bottom: 0.45rem;
  }

  .pager span {
    flex: 1;
    text-align: center;
    color: #6a7384;
    font-size: 0.58rem;
  }

  .pager button {
    appearance: none;
    font: inherit;
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    padding: 0.12rem 0.4rem;
    border-radius: 4px;
    background: transparent;
    color: #9aa3b3;
    border: 1px solid #2a2f3a;
    cursor: pointer;
  }

  .pager button:disabled {
    opacity: 0.4;
    cursor: default;
  }

  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }

  li {
    border-top: 1px solid #1d2129;
    padding-top: 0.35rem;
  }

  li.err .outcome {
    color: #e0a0a0;
  }

  .meta {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
    color: #6a7384;
    font-size: 0.58rem;
  }

  .outcome {
    text-transform: uppercase;
    font-weight: 700;
    color: #8ab4f8;
  }

  .call {
    word-break: break-word;
  }

  .summary {
    color: #9aa3b3;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .actor {
    color: #5a6373;
    font-size: 0.58rem;
    word-break: break-all;
  }

  .empty,
  .err {
    margin: 0;
    color: #5a6373;
    font-size: 0.62rem;
  }

  .err {
    color: #e0a0a0;
  }
</style>
