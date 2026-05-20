# Bills operations primer (ex–`/tools/bills`)

**Audience:** kickagent developers.  
**Status:** The publicweb `/tools/bills/*` UI, `src/lib/server/bills/`, `/api/admin/bills/*`, and ops tables are **removed**. Reimplement in kickagent using this primer and [utility-bill-etl-scope.md](utility-bill-etl-scope.md).

---

## What this covered

Utility-bill ETL prototype: upload PDFs, parse to structured fields, link to units, generate monthly **Appfolio vendor bill CSV**, and track a simple **postings queue** (`pending` → `processing` → `done`).

Three tabs in the old UI:

| Tab | Purpose | Maturity |
|-----|---------|----------|
| **Documents** | Upload PDF, list recent docs, trigger parse | **Functional** |
| **Postings** | Generate monthly CSV, queue status, download | **Functional** |
| **Transactions** | Vendor AND-filter checklist UI | **Scaffold only** — no query/results backend |

Default landing tab was **Transactions** (first tab); last-selected tab was stored in client `uiSettings.billsDefaultTab` (removed with tools UI).

---

## Data model (Postgres)

Target owner: **`operations`** schema in kickagent. Tables were dropped from publicweb DB (migration `0019`); schema definitions are no longer in publicweb `schema.ts`.

| Table | Role |
|-------|------|
| `bill_documents` | One row per PDF; `parse_status`: `received` \| `parsed` \| `failed` \| `skipped` |
| `bill_monthly_files` | Generated CSV artifact + queue `status`: `pending` \| `processing` \| `done` |
| `bill_monthly_file_items` | Join: which documents were included in a monthly file |
| `bill_runs` | Defined for batch audit; **not wired** to the tools UI in practice |
| `units`, `unit_bill_accounts` | Mapping for CSV rows (see [units primer](units-operations-primer.md)) |

**Idempotency:** unique on `(vendor, sha256)` for documents; unique on `(vendor, period)` for monthly files.

**Linking:** `bill_documents.linked_unit_id` set at parse time via `unit_bill_accounts` or `units.utility_account_number`.

---

## S3 storage

Env: `UTILITY_BILL_S3_*` in **kickagent** deploy (removed from publicweb `.env.example`). Keys used the `buildBillStorageKey` pattern (see ETL scope doc):

- **raw** — uploaded PDFs  
- **output** — generated Appfolio CSV  
- Legacy prefix `utility-bills/...` still supported for existing objects

---

## Former publicweb modules (reimplement in KA)

These lived under `src/lib/server/bills/` and related paths; **deleted from publicweb**:

| Former module | Responsibility |
|---------------|----------------|
| `intake.ts` | `ingestBillPdf` — hash dedupe, S3 put, insert `bill_documents` |
| `parseDocument.ts` | Load PDF from S3, run vendor parser, update row, resolve unit link |
| `parsers/` | City/vendor parsers (e.g. Moscow utility; used `pdfjs-dist`) |
| `resolveLinkedUnit.ts` | Match service account → unit |
| `relinkParsedBills.ts` | Re-link after unit/account edits |
| `monthlyBatch.ts` | `generateMonthlyBatchFile`, status transitions, `getMonthlyBatchFile` |
| `monthlyMetrics.ts` | Aggregates for reports UI |
| `storage.ts` | S3 client (`@aws-sdk/client-s3`) |
| `adapters/appfolio/vendorBill.ts` | Appfolio CSV headers + row builder |

---

## Workflows (behavior to preserve)

### 1. Document intake

1. Admin uploads PDF with `category`, `vendor`, `city`.
2. `ingestBillPdf` computes SHA-256; skips duplicate `(vendor, sha256)`.
3. Stores under S3 **raw** key; inserts row with `parse_status = received`.

### 2. Parse

1. `parseBillDocumentById(id)` loads PDF, selects parser by `(category, vendor)`.
2. Writes extracted fields (`service_account_number`, dates, `current_charges_amount`, etc.).
3. Sets `parse_status = parsed` or `failed` with `parse_error`.
4. Sets `linked_unit_id` when account maps to a unit.

### 3. Monthly batch (Postings)

1. **Generate** for `vendor`, `city`, `period` (`YYYY-MM`):
   - Select **parsed** docs with `due_date` in that calendar month.
   - Exclude docs already in `bill_monthly_file_items`.
   - Join `unit_bill_accounts` (+ fallback `units.utility_account_number`).
   - Build CSV rows; fail with explicit list if mapping/fields missing.
   - Upload CSV to S3 **output**; insert `bill_monthly_files` (`pending`) + items.
2. **Queue:** operator marks `pending` → `processing` → `done` (strict transitions).
3. **Download:** GET CSV body from S3 by monthly file id.

### 4. Re-parse (also in Reports + KAM)

Reset `parsed` → `received`, clear parsed fields (vendor-scoped or all). Implemented in:

- `src/routes/api/admin/bills/reset/+server.ts` (JSON POST; used by KAM `reset` command)
- Former Reports Operations forms (removed with UI)

---

## Removed from publicweb

- `/api/admin/bills/recent`, `/api/admin/bills/reset`
- KAM `reset` command

---

## Gaps / non-goals in PW prototype

- No Gmail intake worker in app (manual upload only).
- No scheduled monthly job; generate was form-triggered.
- `bill_runs` table unused in UI.
- Transactions tab had **no** server-side filter/query.
- Email intake and full ETL pipeline: see [utility-bill-etl-scope.md](utility-bill-etl-scope.md).

---

## Suggested KA deliverables

1. Move modules + migrations under kickagent `operations` schema.
2. Expose commands/API: `bills upload`, `bills parse`, `bills generate-monthly`, `bills queue-status`, `bills download`.
3. Replace refresh target `bills.recent-docs` with KAM-UI widgets or SSE job status.
4. Keep S3 key layout compatible or document a migration path.
