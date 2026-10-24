# `/ops/accounts` UI map

**Route:** [`src/routes/ops/accounts/+page.svelte`](../../src/routes/ops/accounts/+page.svelte)  
**Auth:** admin only ([`+page.server.ts`](../../src/routes/ops/accounts/+page.server.ts) → `requireAdmin`)  
**Mission:** [host-mission.md](host-mission.md) — chrome over the list-detail builder.

## Layout

- Nav: Dashboard · Units · **Accounts**
- Title: **Accounts** plus an `i` hover tip (list-detail / manifest note). No inline lead or manifest URL line.
- Filters: [`KickagentListFilters`](../../src/lib/kickagent/KickagentListFilters.svelte) from `resources.gl.list.filters` — one horizontal row, **presence** checkboxes only (text/exact filters such as `type` are not shown; use column quick filters). Checking/unchecking an include box re-runs the list. **Refresh** (hover: `Run gl-list`) re-runs it; **Clear** resets everything below.
- Columns: [`listTable.ts`](../../src/lib/kickagent/listTable.ts). A column gated by an include filter (`hidden` ↔ *Include hidden*, `retiredAt` ↔ *Include retired*) shows only while that box is checked. Gate = column `visibleWhen` when the manifest sets it, else interim name convention (`include<Name>` ↔ key prefix).
- Header: each non-boolean column has a quick filter above its label (case-insensitive substring over raw + displayed value, all filters AND). Click a label to sort asc/desc (▲/▼); default is the first column ascending (never saved). Blanks sort last.
- Keyboard: with a row focused, ↑/↓ move the selection through the displayed (sorted/filtered) order; the detail loads after a short pause so holding the key does not spam `gl-show`.
- Preferences: include boxes, quick filters, and sort persist in `uiSettings.listPrefs.<resource>` ([`uiSettings.svelte.ts`](../../src/lib/client/uiSettings.svelte.ts), version 5). **Clear** is enabled only when something is saved; it wipes them, resets sort, and re-runs the list if the query changed.
- Split: [`KickagentListDetailSplitView`](../../src/lib/kickagent/KickagentListDetailSplitView.svelte) — list fills leftover `main` height and scrolls inside itself. Selecting a row sizes the detail to its content and shrinks the list down to a 5-row floor. `main` scrolls only when that floor plus the full detail is taller than the column. Click the row again to deselect.
- Detail: title row with muted italic id on the right; meta strip omits nulls; value fields; attribute checks in columns 1–2; **Status** (Hidden / Retired) in the final column. Save via `gl-update`. **Retired** confirms then locks. No Hide/Retire command buttons.
- Empty list: log only (`no accounts found`)

## Hub entry

`kickagent:gl-list` → **Open accounts** → `/ops/accounts`.

## Data flow

`gl-list` → `outcomeToTableModel` (`gl.list`) → row select → `gl-show --id` → save → `gl-update` with identity + changed editable flags.
