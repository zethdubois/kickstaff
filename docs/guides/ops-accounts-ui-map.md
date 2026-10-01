# `/ops/accounts` UI map

**Route:** [`src/routes/ops/accounts/+page.svelte`](../../src/routes/ops/accounts/+page.svelte)  
**Auth:** admin only ([`+page.server.ts`](../../src/routes/ops/accounts/+page.server.ts) → `requireAdmin`)

## Layout

- Nav: Dashboard · Units · **Accounts**
- List controls: include hidden (`--include-hidden`), include retired (`--include-retired`), type (`--type`). These flags are not in `resources.gl.list`.
- Table: [`KickagentAccountsSplitView`](../../src/lib/kickagent/KickagentAccountsSplitView.svelte) renders `data.rows` with `resources.gl.list.columns`. Row select loads `gl-show`. Save calls `gl-update`.
- `number` is read-only. Detail also shows `id`, `offsetNumber`, `subjectToLateFees`, `sourceSystem`, and `updatedAt` when they are not list columns.
- Empty list: kickagent returns log only (`no accounts found`), with no `data` and no `presentationRef`. The page shows that log text. It does not parse `log` into columns.

## Hub entry

Dashboard command card with `command_key` `kickagent:gl-list` → **Open accounts** → `goto('/ops/accounts')`.

## Data flow

`onMount` → `runManifestCommand('gl-list', [])` → `outcomeToTableModel` (`presentationRef` `gl.list`) → table state.

Select row → `gl-show --id <id>` → `data.account` (`presentationRef` `gl.detail`).

Save → changed fields only, via `resources.gl.detail.submitCommand` (`gl-update`).
