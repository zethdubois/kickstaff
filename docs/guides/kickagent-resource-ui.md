# Kickagent resource UI (manifest data + Svelte)

**Audience:** Developers wiring kickagent list commands into kickstaff.

Standing mission: [host-mission.md](host-mission.md) — one builder per UI class; do not add per-resource flag tables.

## Contract

| Layer | Responsibility |
| ----- | -------------- |
| **Kickagent** | Manifest `resources.*.list` (columns, filters, `rowsKey`); command returns `outcome.data` + `presentationRef`; optional dumb `log` for KAM scrollback |
| **Kickstaff** | Cache `resources.units` and `resources.gl` on manifest reload; render tables from **data + manifest** — **never** parse pipe-separated `log` |

## Product placement (option D)

| Surface | Role |
| ------- | ---- |
| **Hub command card** (`kickagent:units-list`) | **Trigger** — materialize card, navigate to [`/ops/units`](/ops/units) |
| **`/ops/units`** | **Canonical UI** — filters + [`KickagentUnitsSplitView`](../../src/lib/kickagent/KickagentUnitsSplitView.svelte) (list + detail form) |
| **`/ops/accounts`** | Chart of accounts — `gl-list` table from `resources.gl.list.columns`, detail `gl-show`, save `gl-update`. See [ops-accounts-ui-map.md](ops-accounts-ui-map.md) |
| **KAM Console** | Ad-hoc CLI; log lines stay; optional console table preview |

## Manifest (kickagent ≥ 0.0.3)

See kickagent `docs/manifest-resources.md`. After publish, admin runs **`kam:reload-kickagent`** (or re-login).

Kickstaff parses `resources.units.list` even when `detail` / `update` are not yet published (defaults applied).

## Run outcome shape (`units-list`)

```json
{
  "outcome": {
    "log": ["units: 50 shown of 120", "..."],
    "data": { "rows": [], "count": 120 },
    "presentationRef": "units.list"
  }
}
```

Client: [`runManifestCommand`](../../src/lib/kickagent/runManifestCommand.ts) → [`outcomeToTableModel`](../../src/lib/kickagent/outcomeToTableModel.ts).

## Activation checklist

1. `PUBLIC_KICKAGENT_MANIFEST_URL` set; manifest includes `resources.units.list` with columns.
2. `kam:reload-kickagent` — filters appear in KAM `[KA]` mode.
3. Hub **Open units** or visit `/ops/units` — table headers match manifest, not pipes.
4. Network: `POST /api/kickagent/run` body includes `data.rows` and `presentationRef`.

If table missing but pipes show: check klog for `table UI: missing manifest resources…`.

## Code map

| Path | Purpose |
| ---- | ------- |
| [`manifestResourceCache.ts`](../../src/lib/kickagent/manifestResourceCache.ts) | Parse/cache `resources` |
| [`KickagentListFilters.svelte`](../../src/lib/kickagent/KickagentListFilters.svelte) | Filter form → CLI args |
| [`KickagentResourceList.svelte`](../../src/lib/kickagent/KickagentResourceList.svelte) | Name list + keyboard actions |
| [`KickagentResourceTable.svelte`](../../src/lib/kickagent/KickagentResourceTable.svelte) | Typed columns (legacy / other resources) |
| [`routes/ops/units/+page.svelte`](../../src/routes/ops/units/+page.svelte) | Full-page units |
| [`routes/ops/accounts/+page.svelte`](../../src/routes/ops/accounts/+page.svelte) | Chart of accounts |
| [`unitsOps.ts`](../../src/lib/kickagent/unitsOps.ts) | Hub path + command key helpers |
| [`accountsOps.ts`](../../src/lib/kickagent/accountsOps.ts) | Accounts hub path |

## Related

- [kickstaff-kickagent-consumer.md](contracts/kickstaff-kickagent-consumer.md)
- [kam-console.md](kam-console.md)
- [ops-units-ui-map.md](ops-units-ui-map.md)
