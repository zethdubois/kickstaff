# Now

**Updated:** 2026-10-28  
**Focus:** Product database + host-supplied ops datasets ([frontend guide](../../kickagent/docs/kickagent/architecture/frontend-guide.md))

**Kickstaff** is the default frontend. Contract: [frontend-guide.md](../../kickagent/docs/kickagent/architecture/frontend-guide.md). Dataset requirement: [host-ops-database.md](../../kickagent/docs/kickagent/architecture/host-ops-database.md). Standing host aim: [host-mission.md](guides/host-mission.md). Phase outcomes: [plan.md](plan.md).

**Product database** env names: `DATABASE_URL` / `DATABASE_URL_DEV` (not `core_db`, not `PRODUCT_DATABASE_URL`). Ops URLs and user→dataset grants are **table rows** in that database — not config files.

## This week

- [ ] **Product database:** `DATABASE_URL` / `DATABASE_URL_DEV` **are** the product DB URLs (`…/kickstaff_dev` locally). Ops is the other database on that instance (`…/kickagent_ops_dev`, staging/prod `…/kickagent_ops`). Path = database name. Rows hold the ops URL; until the form ships, spawn rewrites the path.
- [ ] **Dataset table + admin form** per [host-ops-database](../../kickagent/docs/kickagent/architecture/host-ops-database.md): `name`, `label`, `connectionString` (write-only after save), `enabled`. Seed once from env; then rows win.
- [ ] **Subscriptions:** admin sees all enabled datasets on this deploy; other users need a grant row (`user` → dataset `name`). SQL inserts are enough for v1 — no subscription dashboard required.
- [ ] **Active dataset:** `db use` / cookie keeps the **name** only. Check grant, resolve the row server-side, inject `opsDatabase: { name, connectionString }`. Browser never sees the URL.
- [ ] **Do not read kickagent `.env` for a database.** Prefer in-process handlers so the URL stays in this process.
- [ ] **Subscriber `load`:** console `load` / palette done — finish [kickstaff-subscriber-load.md](guides/contracts/kickstaff-subscriber-load.md) wiki/progress proxies + `KICKSTAFF_SUBSCRIBERS` registry. Token rotation is done.

Keep ≤7 active bullets.

## Before next prod deploy (do NOT forget)

- [ ] **Migrate prod** before deploying the per-DB sessions change: `pnpm db:migrate --db prod` applies `0022_sessions_last_seen` (and carries 0021 if needed). Without it, sign-in 500s. Human approval + backup + dry run + [data-ops-log](data-ops-log.md) entry. Check: `pnpm db:status --db prod`.
- [x] Staging and dev already have those migrations (verified 2026-10-26).
- [ ] Heads-up after deploy: everyone signs in once (`ka_session` → `ka_session_<target>`).
- [x] Rotated `KICKAGENT_SERVICE_TOKEN` and related secrets (finished 2026-10-28).

## Blocked

- Kickagent must accept `opsDatabase` and fail without it ([kickagent now](../../kickagent/docs/now.md)). Form and inject can land first; hosted cutover needs both sides.

## Done recently

- Frontend guide pointer in [AGENTS.md](../AGENTS.md); subscriber brief links the contract instead of duplicating it.
- List-detail host for `resources.gl`; KAM console chrome; host mission doc.
- Manifest 0.6.0 consumption (one-way fields, structural role caching).

## How to use this file

| Who | Habit |
| --- | --- |
| **Human** | Open this file first; keep ≤7 active bullets. Follow [AGENTS.md](../AGENTS.md) and [.agent/SOP.md](../.agent/SOP.md). |
| **Agent** | Standing aim: [host-mission.md](guides/host-mission.md). Contract: [frontend-guide.md](../../kickagent/docs/kickagent/architecture/frontend-guide.md). Do the first unchecked item. Tick a [plan.md](plan.md) box only when that **phase outcome** is done. |

`now.md` = this slice’s commands. `plan.md` = phase outcomes.

**When This week is all checked:** close the phase — [.agent/SOP.md — Closing a phase](../.agent/SOP.md#closing-a-phase). Rewrite this list for the next phase; do not leave a fully-checked queue.

## Standing list

Low-priority. Not this week’s queue.

- [ ] Smoke `/ops/accounts` against current manifest after `load kickagent`
- [ ] Keep `/ops/units` on thin v1 until kickagent lifts units to list-detail
- [ ] `kam:history` — collapse consecutive duplicates
- [ ] After units are list-detail: drop thin v1 parser path
- [ ] Optional shared list-detail ops chrome by resource name
- [ ] Toolbar for `role: "structural"` once kickagent documents invoke shape
