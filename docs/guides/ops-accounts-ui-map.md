# `/ops/accounts` UI map

**Route:** [`src/routes/ops/accounts/+page.svelte`](../../src/routes/ops/accounts/+page.svelte)  
**Auth:** admin only ([`+page.server.ts`](../../src/routes/ops/accounts/+page.server.ts) → `requireAdmin`)  
**Mission:** [host-mission.md](host-mission.md) — chrome over the list-detail builder.

## Layout

- Nav: Dashboard · Units · **Accounts**
- Title: **Accounts** plus an `i` hover tip (list-detail / manifest note). No inline lead or manifest URL line.
- Filters: [`KickagentListFilters`](../../src/lib/kickagent/KickagentListFilters.svelte) from `resources.gl.list.filters` — one horizontal row (`presence` + exact + run/clear)
- Split: [`KickagentListDetailSplitView`](../../src/lib/kickagent/KickagentListDetailSplitView.svelte) — list fills leftover column height (min 5 rows); selecting a row opens detail (list shrinks, selected row centers in the list viewport); click again to deselect
- Empty list: log only (`no accounts found`)

## Hub entry

`kickagent:gl-list` → **Open accounts** → `/ops/accounts`.

## Data flow

`gl-list` → `outcomeToTableModel` (`gl.list`) → row select → `gl-show --id` → save → `gl-update` with identity + changed editable flags.
