# `/ops/gl` UI map

**Route:** [`src/routes/ops/[resource]/+page.svelte`](../../src/routes/ops/[resource]/+page.svelte) with `resource=gl`  
**Auth:** admin only ([`+page.server.ts`](../../src/routes/ops/[resource]/+page.server.ts) → `requireAdmin`)  
**Mission:** [host-mission.md](host-mission.md) — chrome over the list-detail builder.

The same page serves every `class: "list-detail"` resource (`/ops/gl`, `/ops/sites`, and later names). The page title and nav label are the manifest resource key. Show-only resources (no `submitCommand`) open detail with no Save.

## Layout

- Nav: one link per manifest resource that has an ops page. The text is `resources.<name>.shortLabel`, or the key when that field is absent. Current page is plain text.
- Title: `resources.<name>.label`, or the key. An `i` hover tip notes that filters, columns, and save flags come from the manifest. No inline lead or manifest URL line.
- List button: `resources.<name>.list.label` (the list command's `commands[].label`). Save button: `update.label`.
- Filters: [`KickagentListFilters`](../../src/lib/kickagent/KickagentListFilters.svelte) from `resources.gl.list.filters` — one horizontal row, **presence** checkboxes only (text/exact filters such as `type` are not shown; use column quick filters). Checking/unchecking an include box re-runs the list. **Refresh** (hover: `Run gl-list`) re-runs it; **Clear** resets everything below.
- Columns: [`listTable.ts`](../../src/lib/kickagent/listTable.ts). A column gated by an include filter (`hidden` ↔ *Include hidden*, `retiredAt` ↔ *Include retired*) shows only while that box is checked. Gate = column `visibleWhen` when the manifest sets it, else interim name convention (`include<Name>` ↔ key prefix).
- Header: each non-boolean column has a quick filter above its label (case-insensitive substring over raw + displayed value, all filters AND). Click a label to sort asc/desc (▲/▼); default is the first column ascending (never saved). Blanks sort last.
- Keyboard: with a row focused, ↑/↓ move the selection through the displayed (sorted/filtered) order; the detail loads after a short pause so holding the key does not spam `gl-show`.
- Preferences: include boxes, quick filters, and sort persist in `uiSettings.listPrefs.<resource>` ([`uiSettings.svelte.ts`](../../src/lib/client/uiSettings.svelte.ts), version 5). **Clear** is enabled only when something is saved; it wipes them, resets sort, and re-runs the list if the query changed.
- Split: [`KickagentListDetailSplitView`](../../src/lib/kickagent/KickagentListDetailSplitView.svelte) — list fills leftover `main` height and scrolls inside itself. Selecting a row sizes the detail to its content and shrinks the list down to a 5-row floor. `main` scrolls only when that floor plus the full detail is taller than the column. Click the row again to deselect.
- Detail: title row with muted italic id on the right; meta strip omits nulls; value fields; attribute checks in columns 1–2; **Status** (Hidden / Retired) in the final column. Save via `gl-update`. **Retired** confirms then locks. No Hide/Retire command buttons.
- Empty list: log only (`no accounts found`)

## Hub entry

Dashboard **Kickagent Resources**: one link per resource (`/ops/<name>`). The card uses `resources.<name>.label` (or the key). Running a command does not add a card. **Kickagent Docs**: `wiki` and `progress` when those paths answer on the kickagent origin.

## Data flow

`gl-list` → `outcomeToTableModel` (`gl.list`) → row select → `gl-show --id` → save → `gl-update` with identity + changed editable flags.
