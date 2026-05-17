# KAM Console and Command Palette

A lightweight in-app dev console for admins. Two surfaces:

- **Command palette** — modal one-shot command input; **`Ctrl+/`** (or **`Cmd+/`**) to open/close. **`` ` `` (backtick)** focuses the KAM Console pane (left); **`Esc`** closes the palette when it is open.
- **KAM Console pane** — left-side "terminal" that shows klog output and has its own inline prompt.

Opening the palette and running `console` toggles the pane.

## Quick start

```text
Ctrl+/   (or Cmd+/)   → open or close palette
` (backtick)         → open KAM Console (if needed) and focus its prompt
console              → toggle the KAM Console pane (command)
help                 → list commands + refresh targets + hotkeys
shell kickagent      → enter kickagent shell ([KA] mode)
ka                   → shortcut only if defined: `alias kickagent ka` (stored in preferences)
shell default        → leave kickagent shell (same when already default)
:exit                → leave kickagent shell from inside [KA] mode (host escape)
unalias --all        → remove every saved alias (or: alias --clear)
reset --all-parsed   → move every parsed bill doc back to 'received' and clear parsed fields
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

| name        | purpose                                                                                                  |
| ----------- | -------------------------------------------------------------------------------------------------------- |
| `console`   | Toggle the KAM Console pane.                                                                             |
| `clear`     | Clear the in-memory klog buffer in the pane (does not touch the persisted history).                      |
| `help`      | Print available commands, refresh targets, and hotkey hint.                                              |
| `echo`      | klog the remaining args.                                                                                 |
| `exit`      | Leave kickagent shell when active (normally via `:exit`; see Kickagent shell).                             |
| `shell`     | `shell kickagent` enters [KA]; `shell default` / `shell off` leaves. The first word may be a **user alias** that expands to `kickagent`, `default`, or `off` (e.g. `shell ka` when `ka` → `kickagent`, or when `ka` → `shell kickagent`). |
| `alias` / `unalias` | Persisted command aliases (`publicweb.consoleUi` in localStorage). See **Command aliases** below. |
| `reset`     | `reset <vendor>` or `reset --all-parsed` — reset matching parsed bill documents back to `received` and clear parsed fields; then refresh `bills.recent-docs`. |
| `kam:reload-kickagent` | Phase 2: refetch `PUBLIC_KICKAGENT_MANIFEST_URL`, verify `sha256`, reload plugin (`kickagent:*` commands). No-op message if env unset. |

### Command aliases

Aliases rewrite the **first token** before resolution (chains up to 8 hops; cycles abort). For **`namespace:command`** tokens, only the **namespace** segment is alias-expanded when the chain yields a **single** head token (no injected words), e.g. **`ka:hello`** → **`kickagent:hello`** if **`ka` → `kickagent`**. A bare token that expands only to **`kickagent`** (same one-word expansion) **enters [KA]** like **`shell kickagent`**. The sugar **`alias kickagent ka`** stores **`shell kickagent`**, so bare **`ka`** also enters [KA] without typing **`shell`**.

| Input | Effect |
| ----- | ------ |
| `alias` | List all aliases |
| `alias kickagent <shortcut>` | `<shortcut>` expands to **`shell kickagent`** (e.g. `alias kickagent ka`) |
| `alias <shortcut> <tokens…>` | `<shortcut>` expands to the remaining words (e.g. `alias h kickagent:hello`) |
| `alias --clear` | Remove **all** saved aliases (same as `unalias --all`) |
| `unalias <shortcut>` | Remove that alias |
| `unalias --all` or `unalias *` | Remove **all** saved aliases |

Shortcuts cannot match an existing host command name (e.g. you cannot **`alias clear …`** — use **`alias c clear`** if you want a letter that runs clear).

Inside **[KA]** shell, use **`:alias`** / **`:unalias`** to reach the host commands.

`alias` and `unalias` cannot be registered as shortcut names. Expansions may not start with **`alias`** or **`unalias`**.

### Kickagent shell (KA mode)

**Naming:** **`kickagent:hello`** is the **subscriber** namespace (`kickagent:` + command). **`shell kickagent`** (or a **user alias** that expands to it) enters the **[KA]** prompt where bare names resolve only under `kickagent:`. Using a meta command literally named `kickagent` would overload that word — the host uses **`shell`** instead.

When **[KA]** is on, **bare** names resolve **only** under the `kickagent:` namespace (no silent fallback to publicweb). For example, `hello` runs `kickagent:hello`. `clear` does **not** run publicweb `clear` unless kickagent registers `kickagent:clear`.

From **outside** [KA]: **`shell kickagent`**, or a shortcut you defined (e.g. **`ka`** after **`alias kickagent ka`**).

From **inside** [KA]: use **:** to reach publicweb commands (`:shell default`, `:exit`, `:help`, …).

| Input | Effect |
| ----- | ------ |
| `hello` | Runs `kickagent:hello` if registered |
| `clear` | Unknown unless `kickagent:clear` exists |
| `:clear` | Runs publicweb `clear` |
| `:help` | Runs publicweb `help` |
| `:exit` | Leaves kickagent shell (host `exit`) |
| `:shell default` | Same as `:exit` (host `shell` with args) |
| `kickagent:hello` | Always works (any mode; explicit qualified subscriber name) |
| `:kickagent:hello` | Same as `kickagent:hello` (host escape with full key) |

`:exit` (and `:shell …`) are the general **escape to publicweb host commands** from inside `[KA]` mode.

`kamMode` is persisted in localStorage (`kamMode` in UI settings). When active, the command line shows **`[KA] >`** and a green accent bar on the prompt row (and palette modal).

Register kickagent-scoped commands with `registerKickagentCommand("hello", handler)` from `$lib/devConsole` or `$lib/kickagent/commands` — it registers the full name `kickagent:hello`.

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
- [src/lib/client/consoleUi.svelte.ts](../../src/lib/client/consoleUi.svelte.ts) — persisted console UI prefs (`commandAliases`, etc.).
- [src/lib/devConsole/commands.ts](../../src/lib/devConsole/commands.ts) — registry, `runCommand`, `CommandOutcome`, built-ins.
- [src/lib/devConsole/refresh.ts](../../src/lib/devConsole/refresh.ts) — refresh target registry.
- [src/lib/devConsole/Palette.svelte](../../src/lib/devConsole/Palette.svelte) — Ctrl+/ modal.
- [src/lib/devConsole/KamConsole.svelte](../../src/lib/devConsole/KamConsole.svelte) — left-side pane.
- [src/routes/+layout.svelte](../../src/routes/+layout.svelte) — mounts both surfaces; admin `hydrateFromServer()` on mount + kickagent Phase 1/2 bootstrap (`$effect`).
- [src/lib/kickagent/loadPluginFromManifest.ts](../../src/lib/kickagent/loadPluginFromManifest.ts) — Phase 2 manifest fetch, `sha256`, dynamic `import`, `register(registry, ctx)`.
- [src/lib/kickagent/pluginSession.ts](../../src/lib/kickagent/pluginSession.ts) — current user snapshot for plugin `KickagentHostContext`.
- [src/routes/api/klogs/+server.ts](../../src/routes/api/klogs/+server.ts) — persistence endpoints.
