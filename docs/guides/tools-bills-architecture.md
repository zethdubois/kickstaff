# Tools Bills Architecture

Architecture guide for the `Tools > Bills` route family.

## Read order

1. [`AGENTS.md`](../../AGENTS.md)
2. This doc (`tools-bills-architecture.md`)
3. [`tools-bills-ui-map.md`](./tools-bills-ui-map.md)

## Route tree

```text
/tools/bills                      -> tab resolver page (last-used tab or default to /transactions)
/tools/bills/documents            -> documents intake/parse UI
/tools/bills/postings             -> monthly batch posting queue UI
/tools/bills/postings/files/[id]/download -> CSV download endpoint
/tools/bills/transactions         -> transactions filter UI scaffold
```

## Layout responsibility

- [`src/routes/tools/bills/+layout.svelte`](../../src/routes/tools/bills/+layout.svelte)
  - Owns the secondary bills tab bar (`Transactions`, `Documents`, `Postings`).
  - Renders active child route via `{@render children()}`.

## Bills landing behavior

- [`src/routes/tools/bills/+page.server.ts`](../../src/routes/tools/bills/+page.server.ts)
  - Serves `/tools/bills` (no server redirect); enforces admin access.
- [`src/routes/tools/bills/+page.svelte`](../../src/routes/tools/bills/+page.svelte)
  - Resolves to last selected Bills tab from `uiSettings`.
  - Falls back to first tab (`/tools/bills/transactions`) when settings are missing/reset.
- [`src/routes/tools/bills/+layout.svelte`](../../src/routes/tools/bills/+layout.svelte)
  - Persists the currently active Bills sub-tab as the next default.

## Documents flow

- Server: [`src/routes/tools/bills/documents/+page.server.ts`](../../src/routes/tools/bills/documents/+page.server.ts)
  - `load` fetches recent bill docs through shared helper.
  - `actions.upload` ingests PDF documents.
  - `actions.parse` parses one document by id.
- UI: [`src/routes/tools/bills/documents/+page.svelte`](../../src/routes/tools/bills/documents/+page.svelte)
  - Upload form + recent documents list + parse buttons.
  - Client refresh target: `bills.recent-docs`.

## Postings flow

- Server: [`src/routes/tools/bills/postings/+page.server.ts`](../../src/routes/tools/bills/postings/+page.server.ts)
  - Generate monthly batch file.
  - Transition queue status (`pending` -> `processing` -> `done`).
- UI: [`src/routes/tools/bills/postings/+page.svelte`](../../src/routes/tools/bills/postings/+page.svelte)
  - Generate form + queue list + status action forms.
- Download endpoint:
  - [`src/routes/tools/bills/postings/files/[id]/download/+server.ts`](../../src/routes/tools/bills/postings/files/[id]/download/+server.ts)

## Transactions flow (current state)

- Server: [`src/routes/tools/bills/transactions/+page.server.ts`](../../src/routes/tools/bills/transactions/+page.server.ts)
  - Provides vendor checklist defaults.
- UI: [`src/routes/tools/bills/transactions/+page.svelte`](../../src/routes/tools/bills/transactions/+page.svelte)
  - Collapsible filters panel with vendor AND checklist.
  - Results/table flow remains future work.

## Data and API touchpoints

- Recent bills API used by Documents refresh:
  - [`src/routes/api/admin/bills/recent/+server.ts`](../../src/routes/api/admin/bills/recent/+server.ts)
- Parse/reset and related bill pipeline logic:
  - `src/lib/server/bills/*`

## Related UI terminology map

- [`docs/guides/tools-bills-ui-map.md`](./tools-bills-ui-map.md)
