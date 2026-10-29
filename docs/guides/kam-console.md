# KAM Console and Command Palette

A lightweight in-app dev console for admins. Two surfaces:

- **Command palette** — modal one-shot command input; **`Ctrl+/`** (or **`Cmd+/`**) to open/close. **`` ` `` (backtick)** focuses the KAM Console pane (left); **`Esc`** closes the palette when it is open.
- **KAM Console pane** — full-height left column (default `min(370px, 90vw)`). The site header and page (including `/ops`) sit in the column to its right: header is a fixed row; **`main`** is the vertical scroller (the document scrollbar does not run beside the header). Closing the pane drops the reserved column so the page uses the full width. The close control is on the left of the pane header; scrollback scrolls on the right. Log timestamps sit 5px from the pane's left edge.

Opening the palette and running `console` toggles the pane.

## Quick start

```text
Ctrl+/   (or Cmd+/)   → open or close palette
` (backtick)         → open KAM Console (if needed) and focus its prompt
console              → toggle the KAM Console pane (command)
help                 → list commands + refresh targets + hotkeys
history              → numbered command history (like bash)
history 20           → last 20 entries
history -c           → clear all history
history -d 3         → delete line 3 (same numbers as `history` list)
!n                   → re-run history line n (after `history`)
!!                   → re-run last command
!-n                  → n commands ago (!-1 = last)
!prefix              → re-run latest command starting with prefix
↑ / ↓                → recall prior commands (console + palette)
load                 → load configured subscribers (manifest + plugin)
load kickagent       → load/refresh kickagent (skip download when sha unchanged)
load --list          → list subscribers (id, version, sha, commands, resources)
load kickagent --force → reload even when sha matches
unload kickagent     → unregister kickagent commands and drop caches
kickagent            → enter kickagent palette ([KA] mode)
ka                   → same if defined: `alias kickagent ka` (or suggested by manifest)
:exit                → leave subscriber palette (host escape)
alias --remove ka    → remove one alias (or: alias --clear for all)
db status            → active DB target, host, connectivity (SELECT 1)
db tables            → list public/drizzle tables (~row counts, local dev only, admin role)
db migrations        → journal vs ledger (ok / pending:N); apply via pnpm db:migrate (admin role)
db use staging       → point this browser at staging (local; needs DATABASE_URL_STAGING); needs a staging sign-in
db use prod          → point this browser at prod (local dev; warns); needs a prod sign-in
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

0. The submitted line is echoed to the scrollback first (`› …` or `[KA] > …`, source `host:prompt`) — from the console prompt or palette.
1. For each key in `refresh`, call the registered refresh target. If a target is missing or throws, the command is treated as failed (subsequent refreshes and log lines are skipped).
2. For each line in `log`, write a klog tagged with `command:<name>`.

A handler that throws is reported as failed and the error is klogged (no refreshes, no log lines).

### Built-in commands

| name        | purpose                                                                                                  |
| ----------- | -------------------------------------------------------------------------------------------------------- |
| `console`   | Toggle the KAM Console pane.                                                                             |
| `clear`     | Clear the in-memory klog buffer in the pane (does not touch the persisted history).                      |
| `help`      | Print available commands, refresh targets, and hotkey hint.                                              |
| `history`   | Numbered command history (`history`, `history 20`, `history -n 20`, `history -c` clear all, `history -d <n>` delete line). Event designators: `!n`, `!!`, `!-n`, `!prefix` (see below). Stored in `localStorage` (`kickstaff.kamCommandHistory`). |
| `echo`      | klog the remaining args.                                                                                 |
| `exit`      | Leave the active subscriber palette (normally via `:exit`). |
| `load`      | Load/refresh subscribers from the configured manifest URL(s). `load`, `load <id>`, `load --list`, `load <id> --force`. Dedupe on content hash (`url@sha256`). |
| `unload`    | `unload <id>` — unregister that subscriber’s commands and drop its caches. |
| `alias`     | Persisted command aliases (`kickstaff.consoleUi` in localStorage). See **Command aliases** below. Use **`alias --remove <shortcut>`** (not a separate `unalias`). |
| `db` | `db status` — active target, host/db name, and `connected: ok` / `failed`. `db tables` — relations in `public` and `drizzle` on the **runtime** target (local dev only). `db migrations` — Drizzle journal vs `drizzle.__drizzle_migrations` (read-only; run **`pnpm db:migrate`** or Kickdesk to apply). `db use dev` \| `staging` \| `prod` — any signed-in user, non-production, when `DATABASE_URL_DEV` is set; reloads if you already have a session on that DB, otherwise opens that DB's login. `db tables` / `db migrations` require the admin role. |

### Database routing (local dev)

- **Default (local):** `dev` when `DATABASE_URL_DEV` is set, else `prod`. No `KICKSTAFF_DB_DEFAULT`. Never `DATABASE_URL || DATABASE_URL_DEV` — [database-targeting.md](database-targeting.md).
- **Pre-auth pick:** `/login?db=dev|staging|prod` sets the cookie before credentials are checked.
- **Console header:** shows `dev` / `staging` / `prod` badge with full label on hover.
- **Connection:** `dev` → `DATABASE_URL_DEV`; `staging` → `DATABASE_URL_STAGING` (or deploy `DATABASE_URL` on Railway staging); `prod` → `DATABASE_URL`.
- **Switching:** `db use staging` / `db use prod` set the httpOnly preference cookie (`kickstaff_db_target`) for this browser only — not a global server switch. Each DB has its own session cookie (`ka_session_<target>`), so the switch grants nothing by itself: you must hold (or log in to get) a session in that DB. See *Sessions and switching* in [database-targeting.md](database-targeting.md).
- **Deployed runtime:** switching disabled. Badge from Railway env name (`RAILWAY_ENVIRONMENT_NAME`); both use that env’s `DATABASE_URL`.
- **CLI:** `pnpm db:status` (inferred default, not cookie), `pnpm db:migrate:status`, `pnpm db:migrate` (dev). Staging/prod: `pnpm db:<cmd> --db staging` \| `--db prod`.
- **KAM inspection** uses the same runtime target as the app (including after `db use …`). **`db migrate` is not available** in the console — use CLI/Kickdesk to apply schema changes.

### Resource tables (kickagent data UI)

- List commands (e.g. **`units-list`**, **`gl-list`**) return **`outcome.data`** + **`presentationRef`**. The accounts and units pages render tables from that data and manifest columns.
- The console stays text. After the summary log (`accounts: 83`), it prints one line per `data.rows` entry (accounts: number, name, type). It does not mount a table widget.
- **Primary units UI:** hub card **Open units** or [`/ops/units`](../../src/routes/ops/units/+page.svelte). See [kickagent-resource-ui.md](kickagent-resource-ui.md).

### Command history (bash-style)

- **↑ / ↓** in the palette or console prompt recall prior commands (newest on first ↑).
- While browsing history, partial input is restored when you press ↓ back to the “new” line.
- **`history`** prints numbered lines; **`history 20`** (or **`history -n 20`**) shows the last *n* entries.
- **`history -c`** clears all stored history (not recorded in history).
- **`history -d <n>`** deletes one line by number (not recorded; renumbers remaining lines).
- **`!{n}`** re-runs the command with that number (same numbering as `history` output).
- **`!!`** re-runs the previous command; **`!-2`** runs two commands ago.
- **`!prefix`** re-runs the most recent command whose text starts with `prefix` (e.g. `!kickagent:hello`).
- Expansion is echoed to klog (`!3 → …`) before the command runs; the **expanded** line is what gets recorded in history.
- History is shared between palette and console and persists across sessions (up to 500 entries).

Implementation: [`src/lib/devConsole/commandHistory.ts`](../../src/lib/devConsole/commandHistory.ts); recording happens in `runCommand`.

### Command aliases

Aliases rewrite the **first token** before resolution (chains up to 8 hops; cycles abort). For **`namespace:command`** tokens, only the **namespace** segment is alias-expanded when the chain yields a **single** head token (no injected words), e.g. **`ka:hello`** → **`kickagent:hello`** if **`ka` → `kickagent`**. A bare token that expands only to **`kickagent`** **enters the kickagent palette**. The sugar **`alias kickagent ka`** stores **`kickagent`**.

| Input | Effect |
| ----- | ------ |
| `alias` | List all aliases |
| `alias kickagent <shortcut>` | `<shortcut>` expands to **`kickagent`** (e.g. `alias kickagent ka`) |
| `alias <shortcut> <tokens…>` | `<shortcut>` expands to the remaining words (e.g. `alias h kickagent:hello`) |
| `alias --remove <shortcut>` | Remove that alias |
| `alias --clear` | Remove **all** saved aliases |

Shortcuts cannot match an existing host command name (e.g. you cannot **`alias clear …`** — use **`alias c clear`** if you want a letter that runs clear).

Inside a subscriber palette, use **`:alias`** to reach the host command.

`alias`, `load`, and `unload` cannot be registered as shortcut names. Expansions may not start with those tokens. There is no separate **`unalias`** command.

### Subscriber palette (KA mode)

**Naming:** Bare host verbs (`help`, `load`, `history`, …). Subscriber commands are **`<namespace>:<name>`** (manifest `namespace`, default `kickagent`). Enter the palette with the **namespace** itself (or its alias); leave with **`:exit`**.

When the palette is on, **bare** names resolve **only** under that namespace (no silent fallback to host). For example, `hello` runs `kickagent:hello`. `clear` does **not** run host `clear` unless the subscriber registers `kickagent:clear`.

From **outside** the palette: type **`kickagent`**, or a shortcut you defined (e.g. **`ka`** after **`alias kickagent ka`** / manifest suggested alias). From **inside**: use **:** for host commands (`:exit`, `:help`, `:load`, …).

| Input | Effect |
| ----- | ------ |
| `hello` | Runs `kickagent:hello` if registered |
| `clear` | Unknown unless `kickagent:clear` exists |
| `:clear` | Runs host `clear` |
| `:help` | Runs host `help` |
| `:exit` | Leaves the palette (host `exit`) |
| `kickagent:hello` | Always works (any mode; explicit qualified name) |
| `:kickagent:hello` | Same as `kickagent:hello` (host escape with full key) |

`activeNamespace` is persisted in localStorage (UI settings v6). When set to `kickagent`, the command line shows **`[KA] >`** and a green accent bar on the prompt row (and palette modal).

**Reload after publish:** **`load kickagent`** (or **`load kickagent --force`**). Login uses the same load path with `force: false` (skips the module download when `url@sha256` matches).

**New kickagent commands:** add a row to kickagent `COMMAND_CATALOG` (see [register-kickagent-command.md](register-kickagent-command.md)). On admin login with no manifest URL, kickstaff registers the Phase 1 catalog via `registerKickagentCatalogCommands`. With a manifest URL, names are always `<namespace>:<shortName>`.

## Refresh targets (the bridge between pages and commands)

A layout or page registers a named refresh callback. Today the host registers **`app.db`** in [`src/routes/+layout.svelte`](../../src/routes/+layout.svelte) so `db use dev|staging|prod` can refresh the console DB badge.

```svelte
<script lang="ts">
  import { onMount } from "svelte";
  import {
    registerRefreshTarget,
    unregisterRefreshTarget,
  } from "$lib/devConsole";

  async function reloadDbBadge() {
    /* refetch /api/dev/database and update UI */
  }

  onMount(() => {
    registerRefreshTarget("app.db", reloadDbBadge);
    return () => unregisterRefreshTarget("app.db");
  });
</script>
```

Any command can declare refresh keys in its outcome:

```ts
return { refresh: ["app.db"], log: "switched database target" };
```

Naming convention: `"<area>.<widget>"` (e.g. `app.db`). Bill/units refresh targets from the old `/tools` UI are removed; operations workflows move to **kickagent** — see [docs/upgrade/README.md](../upgrade/README.md).

Users do **not** type refresh targets. Refresh is always command-declared.

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
