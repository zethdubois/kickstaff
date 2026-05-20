# Reports operations primer (ex–`/tools/reports`)

**Audience:** kickagent developers.  
**Status:** The publicweb `/tools/reports/*` UI has been **removed**. This area was **lightly developed** — useful mainly as concepts and one shared metrics helper.

---

## Honest maturity assessment

| Area | Maturity | Notes |
|------|----------|-------|
| **Operations** tab | **Partial** | Two “re-parse” forms (vendor + global confirm). Same DB effect as KAM `reset` / `/api/admin/bills/reset`. |
| **Monthly** tab | **Early dashboard** | Read-only counts for current month + arbitrary `YYYY-MM` lookup. |
| Scheduling, exports, charts | **Not built** | Copy stated “ad-hoc only, not on a schedule.” |
| `bill_runs` audit UI | **Not built** | Table exists; no reports surface |

Treat Reports as **first concepts**, not a product to port verbatim. Prefer KA job status + metrics API when rebuilding.

---

## Old route structure

```text
/tools/reports              → Operations (re-parse)
/tools/reports/monthly      → Current calendar month metrics
/tools/reports/monthly/[period] → Same metrics for YYYY-MM
```

Secondary tab bar: **Operations** | **Monthly**.

---

## Operations tab (re-parse)

**Load:** Group `bill_documents` by `vendor`, count where `parse_status = parsed`.

**Actions:**

1. **resetVendor** — POST vendor; sets all `parsed` rows for that vendor back to `received`, clears parsed columns (same as API reset for one vendor).
2. **resetAll** — Requires confirm text `RESET ALL`; resets all `parsed` documents globally.

**Left unchanged:** `failed`, `skipped`, `received` rows.

**Removed from publicweb:** KAM `reset` and `/api/admin/bills/reset` — reimplement in kickagent.

---

## Monthly tab (metrics)

**Former server:** `monthlyMetrics.ts` (deleted from publicweb; reimplement in KA)

- `currentPeriod()` → `YYYY-MM` (UTC month).
- `loadMonthlyMetrics(period)` returns:

**Documents** (by `created_at` in month):

- Counts per `parse_status`: `received`, `parsed`, `failed`, `skipped`, `total`

**Postings** (by `bill_monthly_files.period`):

- Counts per file `status`: `pending`, `processing`, `done`
- Sum of `record_count` across files

**UI:** Simple stat cards + form to navigate to `/tools/reports/monthly/{yyyy-mm}` (removed).

No vendor breakdown, no drill-down, no charts.

---

## What to salvage vs rewrite

| Salvage | Rewrite |
|---------|---------|
| `loadMonthlyMetrics` query shape as a starting API response | Tab-based “Reports” IA |
| Re-parse semantics (documented in [bills primer](bills-operations-primer.md)) | Duplicate HTML forms |
| Period validation `YYYY-MM` | Static Svelte pages |

---

## Suggested KA deliverables

1. **Operations:** single `bills reset` command/API (already partially in PW).
2. **Metrics:** `GET /operations/metrics?period=YYYY-MM` backed by same queries as `monthlyMetrics.ts`.
3. **Future:** run-level audit from `bill_runs` when batch runner exists; not from old Reports UI.
