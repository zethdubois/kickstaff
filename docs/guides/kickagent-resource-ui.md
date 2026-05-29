# Kickagent resource UI (manifest data + Svelte)

**Audience:** Developers wiring kickagent list commands into publicweb.

## Contract

| Layer | Responsibility |
| ----- | -------------- |
| **Kickagent** | Manifest `resources.*.list` (columns, filters, `rowsKey`); command returns `outcome.data` + `presentationRef`; optional dumb `log` for KAM scrollback |
| **Publicweb** | Cache resources on manifest reload; render tables from **data + manifest** — **never** parse pipe-separated `log` |

## Product placement (option D)

| Surface | Role |
| ------- | ---- |
| **Hub command card** (`kickagent:units-list`) | **Trigger** — materialize card, navigate to [`/ops/units`](/ops/units) |
| **`/ops/units`** | **Canonical UI** — filters + [`KickagentResourceTable`](../../src/lib/kickagent/KickagentResourceTable.svelte) |
| **KAM Console** | Ad-hoc CLI; log lines stay; optional console table preview |

## Manifest (kickagent ≥ 0.0.3)

See kickagent `docs/manifest-resources.md`. After publish, admin runs **`kam:reload-kickagent`** (or re-login).

Publicweb parses `resources.units.list` even when `detail` / `update` are not yet published (defaults applied).

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
| [`KickagentResourceTable.svelte`](../../src/lib/kickagent/KickagentResourceTable.svelte) | Typed columns |
| [`routes/ops/units/+page.svelte`](../../src/routes/ops/units/+page.svelte) | Full-page units |
| [`unitsOps.ts`](../../src/lib/kickagent/unitsOps.ts) | Hub path + command key helpers |

## Related

- [publicweb-kickagent-consumer.md](contracts/publicweb-kickagent-consumer.md)
- [kam-console.md](kam-console.md)
- [ops-units-ui-map.md](ops-units-ui-map.md)
