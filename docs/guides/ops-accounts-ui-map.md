# `/ops/accounts` UI map

**Route:** [`src/routes/ops/accounts/+page.svelte`](../../src/routes/ops/accounts/+page.svelte)  
**Auth:** admin only ([`+page.server.ts`](../../src/routes/ops/accounts/+page.server.ts) → `requireAdmin`)  
**Mission:** [host-mission.md](host-mission.md) — chrome over the list-detail builder.

## Layout

- Nav: Dashboard · Units · **Accounts**
- Filters: [`KickagentListFilters`](../../src/lib/kickagent/KickagentListFilters.svelte) from `resources.gl.list.filters` (`presence` + exact)
- Split: [`KickagentListDetailSplitView`](../../src/lib/kickagent/KickagentListDetailSplitView.svelte) — table from `list.columns` + `data.rows`; detail from `detail.fields` + `data[recordKey]`; save via field `flag`s
- Empty list: log only (`no accounts found`)

## Hub entry

`kickagent:gl-list` → **Open accounts** → `/ops/accounts`.

## Data flow

`gl-list` → `outcomeToTableModel` (`gl.list`) → row select → `gl-show --id` → save → `gl-update` with identity + changed editable flags.
