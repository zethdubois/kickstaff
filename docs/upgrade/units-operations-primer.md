# Units operations primer (ex–`/tools/units`)

**Audience:** kickagent developers.  
**Status:** The publicweb `/tools/units/*` UI has been **removed**. Schema and relink helpers remain in publicweb until migrated.

---

## Purpose

**Units** are the master record for a rentable/asset address and Appfolio identifiers. **Unit bill accounts** attach vendor-specific service accounts (utility, HOA, etc.) used when generating monthly Appfolio CSV rows from parsed bills.

This data is required for [bills batch generation](bills-operations-primer.md): without a matching `(vendor, service_account_number)` → unit mapping, monthly CSV generation fails with per-file errors.

---

## Data model

Tables in `src/lib/server/schema.ts` (target: `operations` schema):

### `units`

| Field | Notes |
|-------|--------|
| `label` | Display name (required) |
| `street_address`, `city`, `state`, `postal_code`, `notes` | Optional address |
| `utility_account_number` | Optional; used as **fallback** matcher when no `unit_bill_accounts` row |
| `bill_property_code` | Appfolio property id (**required**) |
| `bill_unit_name` | Appfolio unit name; nullable for single-unit properties |
| `active` | Boolean |
| `attributes` | JSONB extension bucket (unused in tools UI) |

**Uniques:** `(bill_property_code, bill_unit_name)`; `utility_account_number` when set.

### `unit_bill_accounts`

Child rows per unit; many per unit (water, power, etc.).

| Field | Notes |
|-------|--------|
| `category` | e.g. `utility` (typed union in code: `billCategories`) |
| `vendor`, `city` | e.g. `city-of-moscow`, `mos` |
| `service_account_number` | Matches `bill_documents.service_account_number` after parse |
| `vendor_payee_name`, `bill_account` | Appfolio CSV columns |
| `default_description_template` | Template with `{vendor}`, `{servicePeriodStart}`, etc. |
| `cash_account` | Optional Appfolio field |
| `service_address_normalized` | Optional |
| `active` | Boolean |

**Unique:** `(vendor, service_account_number)`.

---

## Old UI behavior

### List (`/tools/units`)

- Table: label, address, account count, link to edit.
- **Create unit** form → redirect to detail page.
- **Delete unit** (hard delete; cascades bill accounts).
- **Prefill** query params from Documents tab: `category`, `vendor`, `city`, `service_account_number` — used to speed creating a unit/account when a PDF could not be linked.

### Detail (`/tools/units/[id]`)

- **Update unit** — all unit fields; on save, `relinkParsedUtilityBillsByUnitPrimaryAccount` if `utility_account_number` changed.
- **Add / update / delete bill account** — full CRUD on `unit_bill_accounts`.
- After account add/update: `relinkParsedBillsForBillAccount` re-associates parsed documents for that vendor + service account.

---

## Server logic to migrate

| Module | Role |
|--------|------|
| `src/lib/server/bills/relinkParsedBills.ts` | Recompute `bill_documents.linked_unit_id` after mapping changes |
| `src/lib/server/bills/resolveLinkedUnit.ts` | Used at parse time |

Old route handlers lived under `src/routes/tools/units/` (deleted); **no separate API routes** — all form POST actions.

---

## Integration points

- **Parse:** `parseDocument.ts` → `resolveLinkedUnit`.
- **Monthly CSV:** `monthlyBatch.ts` joins `unit_bill_accounts` ⋈ `units`, with `utility_account_number` fallback.
- **Documents UI** (removed): link to unit detail when `linked_unit_id` set.

---

## Suggested KA deliverables

1. CRUD API or commands for units and bill accounts.
2. Validation mirroring old forms (required fields, unique constraints).
3. Explicit `relink` operation after mapping changes (or automatic on save).
4. Consider soft-delete vs hard-delete (PW used hard delete).
