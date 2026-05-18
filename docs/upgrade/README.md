# Upgrade primers (publicweb → kickagent)

**Audience:** kickagent (KA) developers taking over **operations** workflows that previously lived in publicweb’s removed `/tools/*` UI.

These documents capture **what existed**, **how it behaved**, and **where the logic lives today** in publicweb so you can re-home it under kickagent (`operations` schema, S3, API/commands).

| Primer | Topic |
|--------|--------|
| [bills-operations-primer.md](bills-operations-primer.md) | PDF intake, parse, monthly Appfolio CSV batch, postings queue |
| [units-operations-primer.md](units-operations-primer.md) | Units master data and `unit_bill_accounts` mapping |
| [reports-operations-primer.md](reports-operations-primer.md) | Ad-hoc re-parse ops and monthly metrics (early concepts) |

**Related:** [platform-overview.md](../guides/platform-overview.md), [utility-bill-etl-scope.md](../guides/utility-bill-etl-scope.md), server modules under `src/lib/server/bills/`.

**Still in publicweb (not removed):** KAM console (`reset` command → `/api/admin/bills/*`), admin rental/users, settings dashboard links.
