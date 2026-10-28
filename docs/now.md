# Now

**Updated:** 2026-10-23  
**Focus:** [Phase H1](plan.md) — generic list-detail host (respond to kickagent `resources.gl` / 0.6.0)

Much of the active queue is a **host response to kickagent publisher updates** (manifest `resources.`*, CHANGELOG, wiki). Prefer reload + generic builders over one-off screens. Standing aim: [host-mission.md](guides/host-mission.md). Publisher contract (wiki when up): [manifest-resources](http://127.0.0.1:7097/kickagent/architecture/manifest-resources.md) · [CHANGELOG](http://127.0.0.1:7097/kickagent/CHANGELOG.md).

This week’s work queue. Phase outcomes live in [plan.md](plan.md) — link out, do not copy that list here.

## This week

- [x] Consume `resources.gl` as `class: "list-detail"` v2 — filters (`presence`), `recordKey`, field `flag`s; delete accounts-only form constants
- [x] Host mission doc + agent start ladder ([host-mission.md](guides/host-mission.md), [AGENTS.md](../AGENTS.md))
- [ ] Smoke `/ops/accounts` against live manifest **0.6.0** (after Kickdesk `p` + `kam:reload-kickagent`): list, include-hidden/retired (columns appear + list reloads), column quick filters, sort, ↑/↓ keys, Clear, show, save; tick **Retired** → confirm → saved → box locks and **Retired on** fills
- [ ] When kickagent publishes `resources.properties` (list-detail): reload only — confirm generic builder; add `/ops/…` chrome only if needed ([kickagent now](../../kickagent/docs/now.md) phase 1b)
- [ ] Keep `/ops/units` working on the thin v1 path until kickagent lifts units to list-detail
- [ ] Implement [subscriber load, wiki proxy, progress proxy](guides/contracts/kickstaff-subscriber-load.md) (kickagent manifest 0.7.0). `load kickagent` replaces `kam:reload-kickagent`. Do not start until the token in the section below is rotated.
- [ ] Dataset form per [host-ops-database](../../kickagent/docs/kickagent/architecture/host-ops-database.md). Kickstaff stores every env URL, including dev. Pass the active row into kickagent. Do not read kickagent `.env` for a database.

Keep ≤7 active bullets.

## Before next prod deploy (do NOT forget)

- [ ] **Migrate prod before deploying** the per-DB sessions change: `pnpm db:migrate --db prod` applies `0022_sessions_last_seen` (idempotent; it also carries 0021's `password_reset_tokens`, because prod's migration ledger has newer rows so Drizzle would skip 0021 on its own). Prod currently has **neither** the table nor `sessions.last_seen_at` (verified read-only 2026-10-26). Without 0022, sign-in 500s (code writes `sessions.last_seen_at`). Needs human approval + backup + dry run + a [data-ops-log](data-ops-log.md) entry ([SOP](../.agent/SOP.md)). Check state first: `pnpm db:status --db prod` (prints `migrations: ⚠ PENDING …`; also shown as an amber banner on `/login?db=prod` locally).
- [x] **Staging** already has both (verified 2026-10-26). Dev too.
- [ ] Heads-up for users after deploy: everyone signs in once (cookie renamed `ka_session` → `ka_session_<target>`).
- [ ] Rotate `KICKAGENT_SERVICE_TOKEN` and other secrets from the breach if not done. Also rotate the production database password that was in kickagent `.env`. Kickagent production will not boot without `KICKAGENT_SERVICE_TOKEN` once 0.7.0 is deployed. Staging kickagent needs `KICKAGENT_SERVICES=publish,wiki,progress` and a volume for progress; production stays `publish` only. See [subscriber load](guides/contracts/kickstaff-subscriber-load.md).

## Blocked

- *(none)* — properties chrome waits on kickagent publishing that resource (not blocked on kickstaff code)

## Done recently

- Accounts list: sort by header (default first column ↑), per-column quick filters, ↑/↓ row navigation, include boxes auto-reload and gate their columns, Refresh/Clear, prefs persisted in `uiSettings.listPrefs` (version 5). `type` filter dropped from the page.
- Manifest 0.6.0 consumed: one-way fields (`irreversible` / `confirmText`) lock + confirm on Save; command `role` / `sugarFor` cached (only `structural` is a button candidate). Hide/Retire are fields, not buttons.
- Accounts layout: list fills the column, detail sizes to content (list floor 5 rows), click selected row to deselect, one-row filters, `i` title tip
- KAM console is a full-height left column (`min(370px, 90vw)`). Header and page stay in the other column and take the full width when the pane is closed. Console type is 0.1rem smaller; timestamps sit 5px from the left edge.
- List-detail library: `KickagentListFilters`, `KickagentListDetailSplitView` / pane, `listDetailForm`
- KAM console: text lines for `data.rows` (CLI-like); one timestamp per command result
- `/ops/accounts` driven from schema (no `glAccountForm`)
- Manifest parser discovers list-detail by `class`, keeps units v1 fallback

## How to use this file

| Who | Habit |
|-----|--------|
| **Human** | Open this file first; keep ≤7 active bullets. Follow [AGENTS.md](../AGENTS.md) and [.agent/SOP.md](../.agent/SOP.md). |
| **Agent** | Standing aim: [host-mission.md](guides/host-mission.md). Do the first unchecked item. Tick a [plan.md](plan.md) box only when that **phase outcome** is done. |

`now.md` = this slice’s commands. `plan.md` = phase outcomes.

**When This week is all checked:** close the phase — [.agent/SOP.md — Closing a phase](../.agent/SOP.md#closing-a-phase). Rewrite this list for the next phase; do not leave a fully-checked queue.

## Standing list

Low-priority ideas and polish. Not the week’s queue; pick up when idle or when a phase needs them.

- [ ] `kam:history` — show only the most recent of a repeated series (collapse consecutive duplicates)
- [ ] After kickagent lifts `resources.units` to list-detail: drop the thin v1 parser path and run units through the same builder as GL
- [ ] Optional: shared list-detail ops chrome (one route param by resource name) so `/ops/accounts` and future properties share a shell
- [ ] Toolbar button(s) for `role: "structural"` commands (e.g. **Add account** → `gl-create`) once kickagent publishes how a structural command is invoked (it needs a form: `--number`, `--name`, `--type` are required)
- [ ] After kickagent adds column `visibleWhen` (spec sent): drop the interim `include<Name>` ↔ column-key convention in `listTable.columnGate`
- [ ] After kickagent adds `group: "status"` on `hidden` (+ `retired`): drop the host interim that treats flag `--hidden` as status
- [ ] After saving **Retired**, the row stays in the table until the list is re-run (default filters hide retired). Decide: drop the row, or leave it dimmed
