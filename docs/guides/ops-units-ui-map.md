# `/ops/units` UI map

**Route:** [`src/routes/ops/units/+page.svelte`](../../src/routes/ops/units/+page.svelte)  
**Auth:** admin only ([`+page.server.ts`](../../src/routes/ops/units/+page.server.ts) → `requireAdmin`)

## Layout

- Nav: Dashboard · **Units**
- Filters: [`KickagentListFilters`](../../src/lib/kickagent/KickagentListFilters.svelte) from manifest `resources.units.list.filters`
- Split view: [`KickagentUnitsSplitView`](../../src/lib/kickagent/KickagentUnitsSplitView.svelte) — list column + detail form; highlight loads `units-show`
- Errors: missing manifest cache, API failure, empty rows

## Hub entry

Dashboard command card with `command_key` `kickagent:units-list` → **Open units** → `goto('/ops/units')` ([`+page.svelte` hub](../../src/routes/+page.svelte)).

## Data flow

`onMount` → `runManifestCommand('units-list', [])` → `outcomeToTableModel` → table state.

Filter submit → same with built flag args.
