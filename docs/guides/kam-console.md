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
history              → numbered command history (like bash)
history 20           → last 20 entries
history -c           → clear all history
history -d 3         → delete line 3 (same numbers as `history` list)
!n                   → re-run history line n (after `history`)
!!                   → re-run last command
!-n                  → n commands ago (!-1 = last)
!prefix              → re-run latest command starting with prefix
↑ / ↓                → recall prior commands (console + palette)
shell kickagent      → enter kickagent shell ([KA] mode)
ka                   → shortcut only if defined: `alias kickagent ka` (stored in preferences)
shell default        → leave kickagent shell (same when already default)
:exit                → leave kickagent shell from inside [KA] mode (host escape)
unalias --all        → remove every saved alias (or: alias --clear)
db status            → show active database target (dev Docker vs prod)
db use prod          → super only — switch runtime DB (local dev; warns on prod)
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
| `history`   | Numbered command history (`history`, `history 20`, `history -n 20`, `history -c` clear all, `history -d <n>` delete line). Event designators: `!n`, `!!`, `!-n`, `!prefix` (see below). Stored in `localStorage` (`publicweb.kamCommandHistory`). |
| `echo`      | klog the remaining args.                                                                                 |
| `exit`      | Leave kickagent shell when active (normally via `:exit`; see Kickagent shell).                             |
| `shell`     | `shell kickagent` enters [KA]; `shell default` / `shell off` leaves. The first word may be a **user alias** that expands to `kickagent`, `default`, or `off` (e.g. `shell ka` when `ka` → `kickagent`, or when `ka` → `shell kickagent`). |
| `alias` / `unalias` | Persisted command aliases (`publicweb.consoleUi` in localStorage). See **Command aliases** below. |
| `kam:reload-kickagent` | Phase 2: refetch `PUBLIC_KICKAGENT_MANIFEST_URL`, verify `sha256`, reload plugin (`kickagent:*` commands). No-op message if env unset. |
| `db` | `db status` — active target and host/db name. `db use dev` \| `db use prod` — **super user only** (`ADMIN_EMAIL`), non-production, when `DATABASE_URL_DEV` is set. |

### Database routing (local dev)

- **Default:** app and CLI use `DATABASE_URL_DEV` (Docker Postgres from `pnpm db:up`, host port **5043**) when set.
- **Console header:** shows `dev` or `prod` badge with full label on hover.
- **Super switch:** `db use prod` connects the running dev server to `DATABASE_URL` (Railway). Requires sign-in as the user matching `ADMIN_EMAIL` (same **SUPER** rule as `/admin/users`). Choice is stored in an httpOnly cookie (`publicweb_db_target`).
- **Production:** switching disabled; only `DATABASE_URL` is used.
- **CLI:** `pnpm db:status`, `pnpm db:migrate` (dev), `pnpm db:migrate:prod` (dangerous).

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

**New kickagent commands:** add a row to kickagent `COMMAND_CATALOG` (see [register-kickagent-command.md](register-kickagent-command.md)). On admin login, publicweb registers the full catalog via `registerKickagentCatalogCommands` — you normally do **not** call `registerKickagentCommand` per command in publicweb. KAM names are always `kickagent:<shortName>`.

## Refresh targets (the bridge between pages and commands)

A layout or page registers a named refresh callback. Today the host registers **`app.db`** in [`src/routes/+layout.svelte`](../../src/routes/+layout.svelte) so `db use dev|prod` can refresh the nav DB badge.

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
