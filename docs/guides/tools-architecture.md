# Tools Architecture

Canonical architecture guide for the `/tools` route family.

## Read order

1. [`AGENTS.md`](../../AGENTS.md)
2. This doc (`tools-architecture.md`)
3. [`tools-ui-map.md`](./tools-ui-map.md)

## Route tree

```text
/tools                                  -> redirect to /tools/bills
/tools/bills                            -> bills tab resolver (last-used tab from uiSettings; default transactions)
/tools/bills/documents                  -> bills documents workflow
/tools/bills/postings                   -> bills postings workflow
/tools/bills/postings/files/[id]/download -> postings CSV download
/tools/bills/transactions               -> bills transactions workflow
/tools/units                            -> units list
/tools/units/[id]                       -> unit detail editor
/tools/reports                          -> reports operations
/tools/reports/monthly                  -> monthly metrics dashboard
/tools/reports/monthly/[period]         -> monthly metrics for period (YYYY-MM)
```

## Layout hierarchy

- `src/routes/tools/+layout.server.ts` enforces admin access for all tools routes.
- `src/routes/tools/+layout.svelte` renders primary Tools tabs and wraps children in the panel container.
- Nested layouts:
  - `src/routes/tools/bills/+layout.svelte` (bills secondary tabs)
  - `src/routes/tools/reports/+layout.svelte` (reports secondary tabs)

## Redirect model

- Canonical `Tools` landing path is `/tools/bills`.
- `/tools/bills` resolves client-side to the last selected Bills sub-tab from `uiSettings`.
- First-time default for Bills is the first secondary tab: `/tools/bills/transactions`.

## Route-specific architecture docs

- Bills: [`tools-bills-architecture.md`](./tools-bills-architecture.md)
- Additional route-scope architecture docs should follow naming:
  - `tools-<scope>-architecture.md`
