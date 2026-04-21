# KAM Console and Command Palette

A lightweight in-app dev console for admins. Two surfaces:

- **Command palette** — modal one-shot command input; hotkey `Ctrl+/` (or `Cmd+/`).
- **KAM Console pane** — left-side "terminal" that shows klog output and has its own inline prompt.

Opening the palette and running `console` toggles the pane.

## Quick start

```text
Ctrl+/              → open palette
console             → toggle the KAM Console pane
help                → list commands + refresh targets + hotkeys
reset --all-parsed  → move every parsed bill doc back to 'received' and clear parsed fields
```

## klog (the proprietary logger)

Use from any client code when you want output visible in the pane — entries are also persisted per-user for 30 days.

```ts
import { klog, klogInfo, klogWarn, klogError } from "$lib/devConsole";

klog("hello", { foo: 1 });
klogWarn("rate limit approaching");
klogError(new Error("boom"));
```

- Pane shows timestamp + monospace message.
- Works whether or not the pane is open — opening it later still shows the entries.
- Persisted via a debounced batch POST to `/api/klogs` (admin-only).
- On next page load the pane hydrates with the last 200 klogs for the current user.

## Commands

Commands are registered at module import time and get looked up case-insensitively by the first whitespace-separated token; remaining tokens are passed as `args`.

```ts
import {
  registerCommand,
  type CommandOutcome,
} from "$lib/devConsole";

registerCommand("hello", (args): CommandOutcome => {
  return { log: `hi ${args[0] ?? "world"}` };
});
```

A command handler can return:

- `void` — just do the work, no post-action.
- `CommandOutcome` — a declarative post-action that runs on success.

```ts
export type CommandOutcome = {
  refresh?: string[]; // refresh target keys (run in order)
  log?: string | string[]; // klog lines (written last)
  level?: "log" | "info" | "warn" | "error"; // log level for those lines
};
```

Runner semantics on a successful handler:

1. For each key in `refresh`, call the registered refresh target. If a target is missing or throws, the command is treated as failed (subsequent refreshes and log lines are skipped).
2. For each line in `log`, write a klog tagged with `command:<name>`.

A handler that throws is reported as failed and the error is klogged (no refreshes, no log lines).

### Built-in commands

| name      | purpose                                                                                                  |
| --------- | -------------------------------------------------------------------------------------------------------- |
| `console` | Toggle the KAM Console pane.                                                                             |
| `clear`   | Clear the in-memory klog buffer in the pane (does not touch the persisted history).                      |
| `help`    | Print available commands, refresh targets, and hotkey hint.                                              |
| `echo`    | klog the remaining args.                                                                                 |
| `reset`   | `reset <vendor>` or `reset --all-parsed` — reset matching parsed bill documents back to `received` and clear parsed fields; then refresh `bills.recent-docs`. |

## Refresh targets (the bridge between pages and commands)

A page component registers a named refresh callback:

```svelte
<script lang="ts">
  import { onMount } from "svelte";
  import {
    registerRefreshTarget,
    unregisterRefreshTarget,
  } from "$lib/devConsole";

  async function reload() {
    /* fetch + update local state */
  }

  onMount(() => {
    registerRefreshTarget("bills.recent-docs", reload);
    return () => unregisterRefreshTarget("bills.recent-docs");
  });
</script>
```

Any command can then declare it in its outcome:

```ts
return { refresh: ["bills.recent-docs"], log: "reset complete" };
```

Naming convention: `"<page>.<widget>"`, e.g. `bills.recent-docs`, `bills.postings.list`, `units.list`.

Users do **not** type refresh targets. The old `--refresh <target>` user flag has been removed; refresh is always command-declared.

## Persistence

Table: `klogs` (see [src/lib/server/schema.ts](../../src/lib/server/schema.ts)).

| column     | notes                                                             |
| ---------- | ----------------------------------------------------------------- |
| `id`       | uuid, primary key                                                 |
| `user_id`  | nullable, references `users.id` (`ON DELETE SET NULL`)            |
| `ts`       | timestamptz, client-generated when available                      |
| `level`    | `log` \| `info` \| `warn` \| `error`                              |
| `message`  | rendered klog message                                             |
| `source`   | e.g. `command:reset`, or null for a direct `klog(...)` call       |

Endpoints at [src/routes/api/klogs/+server.ts](../../src/routes/api/klogs/+server.ts):

- `POST /api/klogs` — admin-only; body `{ entries: [{ ts, level, message, source? }] }`. Inserts with `user_id = locals.user.id`. Best-effort prune on write: deletes rows older than 30 days.
- `GET /api/klogs?limit=200` — admin-only; most recent N for current user, returned oldest-first.

## Files

- [src/lib/devConsole/state.svelte.ts](../../src/lib/devConsole/state.svelte.ts) — pane state, `klog*` API, batched persistence, hydration.
- [src/lib/devConsole/commands.ts](../../src/lib/devConsole/commands.ts) — registry, `runCommand`, `CommandOutcome`, built-ins.
- [src/lib/devConsole/refresh.ts](../../src/lib/devConsole/refresh.ts) — refresh target registry.
- [src/lib/devConsole/Palette.svelte](../../src/lib/devConsole/Palette.svelte) — Ctrl+/ modal.
- [src/lib/devConsole/KamConsole.svelte](../../src/lib/devConsole/KamConsole.svelte) — left-side pane.
- [src/routes/+layout.svelte](../../src/routes/+layout.svelte) — mounts both surfaces; calls `hydrateFromServer()` for admins on mount.
- [src/routes/api/klogs/+server.ts](../../src/routes/api/klogs/+server.ts) — persistence endpoints.
