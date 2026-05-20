# Utility Bill ETL Execution Checklist

> **KA implementation reference** — not publicweb code.

Implementation checklist derived from [utility-bill-etl-scope.md](utility-bill-etl-scope.md).

Use this as the execution tracker for delivery. Each checkbox should map to a PR or a clearly logged operational task.

## Global Delivery Rules

- [ ] Keep all PDF processing and CSV generation server-side.
- [ ] Use `pnpm` and existing project conventions from `AGENTS.md`.
- [ ] Keep secrets in server-only env vars; never expose mailbox or storage creds to client code.
- [ ] Enforce idempotency for intake and batch generation before enabling automation.

## Phase 1 - Foundation

Goal: ingest documents, persist source files, and parse first city format reliably.

### 1.1 Schema and migrations

- [ ] Add `utility_bill_documents` table.
- [ ] Add `utility_account_mappings` table.
- [ ] Add `utility_bill_runs` table.
- [ ] Add indexes and uniqueness constraints:
  - [ ] (`vendor`, `sha256`)
  - [ ] (`vendor`, `bill_reference`) where applicable
  - [ ] (`vendor`, `service_account_number`) on mapping table
  - [ ] (`vendor`, `period`) on runs
- [ ] Run migration locally and verify clean `pnpm db:migrate`.

### 1.2 Storage adapter (`t3.storageapi.dev`)

- [ ] Implement S3-compatible storage wrapper (put/get/list/head).
- [ ] Add configurable endpoint support for `https://t3.storageapi.dev`.
- [ ] Implement object key convention:
  - [ ] `utility-bills/raw/...`
  - [ ] `utility-bills/parsed/...`
  - [ ] `utility-bills/output/...`
  - [ ] `utility-bills/errors/...`
- [ ] Add structured metadata tags (`vendor`, `city`, `email_message_id`, `sha256`, `run_id`).

### 1.3 Manual intake path

- [ ] Provide a manual intake path (script or admin-only endpoint) for PDF upload.
- [ ] Compute and persist `sha256`.
- [ ] Record intake row in `utility_bill_documents` with initial parse status.
- [ ] Prevent duplicate ingest by hash/message-id logic.

### 1.4 Moscow parser v1

- [ ] Implement parser contract (`pdf -> normalizedBill`).
- [ ] Extract required normalized fields:
  - [ ] service account number
  - [ ] bill reference
  - [ ] bill date
  - [ ] due date
  - [ ] service period start/end
  - [ ] current charges amount
  - [ ] service address
- [ ] Validate parser picks current charges (not total due with prior balance).
- [ ] Persist parse results and parse errors in `utility_bill_documents`.

### Phase 1 exit criteria

- [ ] At least one real/sample Moscow PDF ingests and parses successfully.
- [ ] Duplicate ingest guard is verified.
- [ ] Failed parse paths produce actionable error messages.

## Phase 2 - CSV and Mapping Workflow

Goal: convert parsed data into Appfolio-compatible monthly CSV with required-field enforcement.

### 2.1 Mapping source of truth

- [ ] Define and seed initial `utility_account_mappings` dataset.
- [ ] Confirm ownership process for maintaining mappings.
- [ ] Ensure unknown account numbers are flagged, not silently dropped.

### 2.2 Appfolio CSV writer

- [ ] Implement deterministic CSV writer for template column order.
- [ ] Map all required fields:
  - [ ] Bill Property Code
  - [ ] Vendor Payee Name
  - [ ] Amount
  - [ ] Bill Account
  - [ ] Bill Date
  - [ ] Due Date
  - [ ] Posting Date (due date policy)
- [ ] Implement optional fields defaults (`Bill Remarks`, `Memo For Check`, `Purchase Order Number`, `Cash Account`).
- [ ] Enforce required-field validation before row export.

### 2.3 Monthly batch runner

- [ ] Implement batch command for a target period (`YYYY-MM`).
- [ ] Create `utility_bill_runs` entry at start and finalize on completion.
- [ ] Produce output CSV key:
  - [ ] `utility-bills/output/{vendor}/{yyyy}/{mm}/appfolio_vendor_bills_{vendor}_{yyyy}-{mm}.csv`
- [ ] Mark run as:
  - [ ] `completed`
  - [ ] `completed_with_errors`
  - [ ] `failed`
- [ ] Store summary counts and total current charges.

### Phase 2 exit criteria

- [ ] Monthly dry run produces a valid CSV file for sample data.
- [ ] Required Appfolio columns are populated for all exported rows.
- [ ] Failed documents are visible via run/document audit records.

## Phase 3 - Automation and Operations

Goal: automate intake and monthly generation with safe operations.

### 3.1 Gmail intake automation

- [ ] Select production default:
  - [ ] IMAP polling worker (recommended), or
  - [ ] Apps Script forwarding/webhook
- [ ] Add sender allowlist and attachment content-type checks (PDF only).
- [ ] Enforce attachment size limits and parse-safe handling.
- [ ] Mark processed messages idempotently to avoid repeat ingestion.

### 3.2 Railway schedules and runtime

- [ ] Configure frequent intake schedule.
- [ ] Configure monthly batch schedule.
- [ ] Ensure both schedules run in server-controlled context (not browser-triggered).
- [ ] Ensure logs are retained and searchable per run.

### 3.3 Operator workflows

- [ ] Add run visibility page/API (last run, totals, failures).
- [ ] Add output CSV download path for operators.
- [ ] Add retry/re-run command for a period without duplicate output rows.
- [ ] Document failure triage steps (mapping fix, parser fix, rerun).

### Phase 3 exit criteria

- [ ] Automated intake runs without manual intervention.
- [ ] Monthly scheduled run produces CSV and run audit row.
- [ ] Re-run is safe and idempotent.

## Cross-Cutting Quality Checklist

- [ ] Unit tests for parser field extraction and currency/date normalization.
- [ ] Integration test for batch run from ingested PDF -> CSV artifact.
- [ ] Regression fixture set for each city parser format.
- [ ] Structured logs include `run_id`, `document_id`, and `vendor`.
- [ ] Alerting trigger for `completed_with_errors` and `failed` runs.

## Release Readiness Gate

- [ ] Confirm accountant/ops sign-off on:
  - [ ] current-period amount policy
  - [ ] posting-date equals due-date policy
  - [ ] Bill Account mapping defaults
- [ ] Validate one full month end-to-end in staging-like environment.
- [ ] Backfill/replay strategy documented for missed monthly windows.

