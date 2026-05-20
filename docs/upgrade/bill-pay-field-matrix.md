# Bill pay field matrix

> **KA implementation reference** — former publicweb schema; adapter code removed from this repo.

What `Unit` and `unit_bill_accounts` fields each (category × external system) pair
needs in order to produce a valid export. Plain markdown today; if/when the UI
becomes schema-driven we can promote this to Zod schemas.

## Conventions

- "Required" = the export will fail without this value.
- "Optional" = the export will succeed; a sensible default or empty string is used.
- Field names use snake_case where they map to a DB column, camelCase where they
  refer to a parsed bill field.

---

## category: `utility` × adapter: `appfolio` (Vendor Bills bulk import)

Adapter source: reimplement in kickagent; template CSV: [bulk_vendor_bill_upload_template__appfolio.csv](bulk_vendor_bill_upload_template__appfolio.csv)

### From `units`

| Field                    | Required | Notes                                                              |
| ------------------------ | -------- | ------------------------------------------------------------------ |
| `bill_property_code`     | ✅       | Maps to Appfolio "Bill Property Code\*".                           |
| `bill_unit_name`         | ⚪       | Empty string when null.                                            |
| `utility_account_number` | ⚪       | Used for unit-level lookup when no `unit_bill_accounts` row exists. |

### From `unit_bill_accounts` (matched on `vendor` + `service_account_number`)

| Field                          | Required | Notes                                                                  |
| ------------------------------ | -------- | ---------------------------------------------------------------------- |
| `category`                     | ✅       | Filter: must equal `utility`. Defaults to `utility` on insert.         |
| `vendor`                       | ✅       | Lookup key.                                                            |
| `service_account_number`       | ✅       | Lookup key.                                                            |
| `vendor_payee_name`            | ✅       | Maps to Appfolio "Vendor Payee Name\*".                                |
| `bill_account`                 | ✅       | Maps to Appfolio "Bill Account\*" (GL account).                        |
| `default_description_template` | ⚪       | Falls back to `"{vendor} bill {servicePeriodStart} to {servicePeriodEnd}"`. |
| `cash_account`                 | ⚪       | Empty string when null.                                                |
| `active`                       | ✅       | Inactive accounts are skipped.                                         |

### From the parsed bill (`bill_documents`)

| Field                    | Required | Notes                                                                          |
| ------------------------ | -------- | ------------------------------------------------------------------------------ |
| `service_account_number` | ✅       | Used to find the matching `unit_bill_accounts` row.                            |
| `due_date`               | ✅       | Maps to "Due Date\*" and (today) "Posting Date\*".                             |
| `bill_date`              | ⚪       | Falls back to `due_date` when null.                                            |
| `current_charges_amount` | ✅       | Maps to "Amount\*". Falls back to `rawParseJson` keys (see `monthlyBatch.ts`). |
| `bill_reference`         | ⚪       | Falls back to `${service_account_number}-${period}`.                           |
| `service_period_start`   | ⚪       | Used in the description template.                                              |
| `service_period_end`     | ⚪       | Used in the description template.                                              |

---

## category: `insurance` × adapter: `appfolio`

Not yet implemented. Stub for future:

- Likely the same `unit_bill_accounts` shape works (vendor = carrier, service_account_number = policy number).
- May need a per-unit `coverage_period` attribute (use `units.attributes` jsonb until justified for a typed column).

## category: `tax` × adapter: `appfolio`

Not yet implemented. Tax bills are typically annual, so the monthly batch shape
will need a `frequency` concept before this is built.

---

## Out-of-band fields (not in any export today)

The following live on the schema but are not consumed by the Appfolio adapter.
Document additions here as they're wired to outputs:

- `units.street_address`, `units.city`, `units.state`, `units.postal_code`, `units.notes`
- `units.attributes` (jsonb flex zone)
- `unit_bill_accounts.service_address_normalized`
