# Upgrade primers (publicweb → kickagent)

**Audience:** kickagent (KA) developers rebuilding **operations** (bills, units, reports) after publicweb removed the native experiment.

These documents capture **what existed**, **how it behaved**, and **what to reimplement** in kickagent (`operations` schema, S3, commands/API). **No bill/units code or tables remain in publicweb** (migration `0019_drop_operations_tables`).

## Behavior primers (ex–`/tools/*`)

| Primer | Topic |
|--------|--------|
| [bills-operations-primer.md](bills-operations-primer.md) | PDF intake, parse, monthly Appfolio CSV batch, postings queue |
| [units-operations-primer.md](units-operations-primer.md) | Units master data and `unit_bill_accounts` mapping |
| [reports-operations-primer.md](reports-operations-primer.md) | Ad-hoc re-parse ops and monthly metrics (early concepts) |

## Implementation reference (KA — not publicweb code)

| Doc | Topic |
|-----|--------|
| [utility-bill-etl-scope.md](utility-bill-etl-scope.md) | Full ETL scope: email → PDF → Appfolio CSV |
| [utility-bill-etl-execution-checklist.md](utility-bill-etl-execution-checklist.md) | Phase checklist and release gates |
| [utility-bill-phase-1-pr-checklist.md](utility-bill-phase-1-pr-checklist.md) | Phase 1 PR sequencing |
| [bill-pay-field-matrix.md](bill-pay-field-matrix.md) | Appfolio vendor bill field matrix |
| [bulk_vendor_bill_upload_template__appfolio.csv](bulk_vendor_bill_upload_template__appfolio.csv) | Appfolio bulk upload template |

**Related:** [platform-overview.md](../guides/platform-overview.md), [kam-console.md](../guides/kam-console.md).

**Still in publicweb:** rental pages, `/admin`, `/settings`, KAM host (kickagent plugin load, `db`, klog) — not bill processing.
