# Developer guides (`docs/guides/`)

**Developer / agent** reference for this repository — implementation notes, route architecture, and workflows. These are **not** end-user support FAQs.

## Start here

| Doc | Purpose |
|-----|---------|
| [README.md](../../README.md#development) | **Local dev setup** — install, DB, seed, `pnpm dev`, troubleshooting |
| [AGENTS.md](../../AGENTS.md) | Stack, tooling, env summary, route-doc pipeline, naming |
| [production-operations.md](production-operations.md) | **Production operators** — vanity domains, AppFolio links, admin workflows |
| [../sop-svelte-and-components.md](../sop-svelte-and-components.md) | Required `.svelte` layout, file headers, guide naming |

Environment source of truth: [`.env.example`](../../.env.example).

## Route architecture (paired docs)

Read in order: **AGENTS.md** → **`*-architecture.md`** → **`*-ui-map.md`** for the route you are changing.

| Area | Architecture | UI map |
|------|--------------|--------|
| Tools (overview) | [tools-architecture.md](tools-architecture.md) | [tools-ui-map.md](tools-ui-map.md) |
| Tools → Bills | [tools-bills-architecture.md](tools-bills-architecture.md) | [tools-bills-ui-map.md](tools-bills-ui-map.md) |
| Tools IA | [tools-information-architecture.md](tools-information-architecture.md) | — |

## Admin routes

| Guide | Route / topic |
|-------|----------------|
| [admin-rental-links.md](admin-rental-links.md) | `/admin/rental-links` |
| [admin-users.md](admin-users.md) | `/admin/users` |

## Components (`src/lib/`)

Paired guides match component filenames (see SOP):

| Guide | Component |
|-------|-----------|
| [RentalLandingGrid.md](RentalLandingGrid.md) | `RentalLandingGrid.svelte` |

## KAM console & kickagent

| Guide | Topic |
|-------|--------|
| [kam-console.md](kam-console.md) | Dev console, `Ctrl+/`, klog, command palette |
| [publicweb-hello-world.md](publicweb-hello-world.md) | kickagent hello-world integration in publicweb |
| [kickagent-hello-world.md](kickagent-hello-world.md) | kickagent package hello-world contract |
| [kickagent-essentials-spec.md](kickagent-essentials-spec.md) | kickagent essentials spec |

## Utility bill ETL

| Guide | Purpose |
|-------|---------|
| [utility-bill-etl-scope.md](utility-bill-etl-scope.md) | Full scope: email intake → PDF parsing → Appfolio CSV |
| [utility-bill-etl-execution-checklist.md](utility-bill-etl-execution-checklist.md) | Phase-by-phase checklist and release gates |
| [utility-bill-phase-1-pr-checklist.md](utility-bill-phase-1-pr-checklist.md) | Phase 1 PR sequencing |
| [bill-pay-field-matrix.md](bill-pay-field-matrix.md) | Bill pay field matrix |

## Other notes in `docs/`

Files such as `General Dev Notes.md` or `Sloppy Dev Guide.md` may exist for ad-hoc notes; they are **not** part of the mandatory doc pipeline unless linked from the SOP or a route guide.
