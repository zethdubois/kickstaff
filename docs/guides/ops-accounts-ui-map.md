# `/ops/accounts` UI map

**Route:** [`src/routes/ops/accounts/+page.svelte`](../../src/routes/ops/accounts/+page.svelte)  
**Auth:** admin only ([`+page.server.ts`](../../src/routes/ops/accounts/+page.server.ts) → `requireAdmin`)  
**Mission:** [host-mission.md](host-mission.md) — chrome over the list-detail builder.

## Layout

- Nav: Dashboard · Units · **Accounts**
- Title: **Accounts** plus an `i` hover tip (list-detail / manifest note). No inline lead or manifest URL line.
- Filters: [`KickagentListFilters`](../../src/lib/kickagent/KickagentListFilters.svelte) from `resources.gl.list.filters` — one horizontal row (`presence` + exact + run/clear)
- Split: [`KickagentListDetailSplitView`](../../src/lib/kickagent/KickagentListDetailSplitView.svelte) — list fills leftover `main` height and scrolls inside itself. Selecting a row sizes the detail to its content and shrinks the list down to a 5-row floor. `main` scrolls only when that floor plus the full detail is taller than the column. Click the row again to deselect.
- Detail: title row with muted italic id on the right; meta strip omits nulls; value fields; attribute checks in columns 1–2; **Status** (Hidden / Retired) in the final column. Save via `gl-update`. **Retired** confirms then locks. No Hide/Retire command buttons.
- Empty list: log only (`no accounts found`)

## Hub entry

`kickagent:gl-list` → **Open accounts** → `/ops/accounts`.

## Data flow

`gl-list` → `outcomeToTableModel` (`gl.list`) → row select → `gl-show --id` → save → `gl-update` with identity + changed editable flags.
