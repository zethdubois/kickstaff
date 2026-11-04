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
| **Hub link** (`/ops/<name>`) | **Kickagent Resources** column. One link per manifest resource. The label is the resource key |
| **`/ops/units`** | Units v1 page — filters + [`KickagentUnitsSplitView`](../../src/lib/kickagent/KickagentUnitsSplitView.svelte). List command is `resources.units.list.command` |
| **`/ops/<name>`** | List-detail page for that resource key. See [ops-accounts-ui-map.md](ops-accounts-ui-map.md). Show-only when `submitCommand` is absent |
| **Console** | Ad-hoc CLI; log lines stay; optional console table preview |

## Manifest (kickagent ≥ 0.0.3)

See kickagent `docs/manifest-resources.md`. After publish, admin runs **`load kickagent`** (or re-login).

Kickstaff parses `resources.units.list` when `detail` / `update` are absent. It does not invent `units-show` or `units-update`.

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
2. `load kickagent` — filters appear in the `[KA]` palette.
3. Hub link `units` or visit `/ops/units` — table headers match manifest, not pipes.
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
| [`routes/ops/[resource]/+page.svelte`](../../src/routes/ops/[resource]/+page.svelte) | List-detail resources (`/ops/gl`, `/ops/sites`) |
| [`opsResources.ts`](../../src/lib/kickagent/opsResources.ts) | Nav and hub links from resource keys |

## Related

- [kickstaff-kickagent-consumer.md](contracts/kickstaff-kickagent-consumer.md)
- [console.md](console.md)
- [ops-units-ui-map.md](ops-units-ui-map.md)
