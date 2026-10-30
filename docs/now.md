# Now

**Updated:** 2026-10-30  
**Focus:** Product database + host-supplied ops datasets ([frontend guide](../../kickagent/docs/kickagent/architecture/frontend-guide.md))

**Kickstaff** is the default frontend. Contract: [frontend-guide.md](../../kickagent/docs/kickagent/architecture/frontend-guide.md). Dataset requirement: [host-ops-database.md](../../kickagent/docs/kickagent/architecture/host-ops-database.md). Standing host aim: [host-mission.md](guides/host-mission.md). Phase outcomes: [plan.md](plan.md).

**Product database** env names: `DATABASE_URL` / `DATABASE_URL_DEV` (not `core_db`, not `PRODUCT_DATABASE_URL`). Ops URLs and user→dataset grants are **table rows** in that database — not config files.

## This week

- [x] **Product database:** `DATABASE_URL` / `DATABASE_URL_DEV` **are** the product DB URLs (`…/kickstaff_dev` locally). Ops is the other database on that instance (`…/kickagent_ops_dev`, staging/prod `…/kickagent_ops`). Path = database name. Rows hold the ops URL; spawn still rewrites path as bridge.
- [x] **Dataset table + admin form** per [host-ops-database](../../kickagent/docs/kickagent/architecture/host-ops-database.md): `/admin/datasets`, migration `0023_ops_datasets`, `pnpm seed:ops-datasets`. Seed once from env; then rows win.
- [x] **Subscriptions:** admin sees all enabled datasets; others need `ops_dataset_grants` (SQL v1). Enforced in `resolveOpsDatabase`.
- [x] **Active dataset:** active product target name → ops row; inject `opsDatabase` on `/api/kickagent/run`. Browser never sees the URL. (Product multi-DB switch unchanged this pass.)
- [x] **Do not read kickagent `.env` for a database.** Spawn skips kickagent `DATABASE_URL*`; injects host-resolved ops URL / `opsDatabase`.
- [ ] **Subscriber `load`:** console `load` / palette done — finish [kickstaff-subscriber-load.md](guides/contracts/kickstaff-subscriber-load.md) wiki/progress proxies + `KICKSTAFF_SUBSCRIBERS` registry. Token rotation is done.

Keep ≤7 active bullets.

## Before next prod deploy (do NOT forget)

- [ ] **Migrate prod** before next deploy: `pnpm db:migrate --db prod` (includes `0022_sessions_last_seen`, `0023_ops_datasets`, and `0024_midterm_rentals`). Human approval + backup + dry run + [data-ops-log](data-ops-log.md) entry. Then `pnpm seed:ops-datasets --db prod`. Check: `pnpm db:status --db prod`.
- [x] Staging and dev already have 0021/0022 (verified 2026-10-26). Apply **0023** on each product DB after pull.
- [ ] Heads-up after deploy: everyone signs in once (`ka_session` → `ka_session_<target>`).
- [x] Rotated `KICKAGENT_SERVICE_TOKEN` and related secrets (finished 2026-10-28).

## Blocked

- Kickagent must accept `opsDatabase` and fail without it ([kickagent now](../../kickagent/docs/now.md)). Form and inject landed; hosted cutover needs both sides.

## Done recently

- Ops datasets table + `/admin/datasets` + `opsDatabase` inject on kickagent run (spawn rewrite bridge remains).
- Frontend guide pointer in [AGENTS.md](../AGENTS.md); subscriber brief links the contract instead of duplicating it.
- List-detail host for `resources.gl`; KAM console chrome; host mission doc.

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
