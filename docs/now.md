# Now

**Updated:** 2026-10-02  
**Focus:** [Phase H1](plan.md) — generic list-detail host (respond to kickagent `resources.gl` / 0.3.0)

Much of the active queue is a **host response to kickagent publisher updates** (manifest `resources.*`, CHANGELOG, wiki). Prefer reload + generic builders over one-off screens. Standing aim: [host-mission.md](guides/host-mission.md). Publisher contract (wiki when up): [manifest-resources](http://127.0.0.1:7097/kickagent/architecture/manifest-resources.md) · [CHANGELOG](http://127.0.0.1:7097/kickagent/CHANGELOG.md).

This week’s work queue. Phase outcomes live in [plan.md](plan.md) — link out, do not copy that list here.

## This week

- [x] Consume `resources.gl` as `class: "list-detail"` v2 — filters (`presence`), `recordKey`, field `flag`s; delete accounts-only form constants
- [x] Host mission doc + agent start ladder ([host-mission.md](guides/host-mission.md), [AGENTS.md](../AGENTS.md))
- [ ] Smoke `/ops/accounts` against live manifest **0.3.0+** (list, include-hidden/retired, type filter, show, save)
- [ ] When kickagent publishes `resources.properties` (list-detail): reload only — confirm generic builder; add `/ops/…` chrome only if needed ([kickagent now](../../kickagent/docs/now.md) phase 1b)
- [ ] Keep `/ops/units` working on the thin v1 path until kickagent lifts units to list-detail

Keep ≤7 active bullets.

## Blocked

- *(none)* — properties chrome waits on kickagent publishing that resource (not blocked on kickstaff code)

## Done recently

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
