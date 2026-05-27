# Developer guides (`docs/guides/`)

**Developer / agent** reference for this repository — implementation notes, route architecture, and workflows. These are **not** end-user support FAQs.

## Start here


| Doc                                                                | Purpose                                                                    |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| [platform-overview.md](platform-overview.md)                         | **Architecture** — publicweb vs kickagent, one DB / two schemas, KAM / KAM-UI |
| [database-targeting.md](database-targeting.md)                       | **Dev vs prod DB** — `PUBLICWEB_DB_DEFAULT`, CLI vs KAM cookie (aligned with kickagent) |
| [README.md](../../README.md#development)                           | **Local dev setup** — install, DB, seed, `pnpm dev`, troubleshooting       |
| [AGENTS.md](../../AGENTS.md)                                       | Stack, tooling, env summary, route-doc pipeline, naming                    |
| [production-operations.md](production-operations.md)               | **Production operators** — vanity domains, AppFolio links, admin workflows |
| [../sop-svelte-and-components.md](../sop-svelte-and-components.md) | Required `.svelte` layout, file headers, guide naming                      |


Environment source of truth: `[.env.example](../../.env.example)`.

## Operations handoff (kickagent)

| Doc | Purpose |
|-----|---------|
| [../upgrade/README.md](../upgrade/README.md) | Index — bills, units, reports primers (ex–`/tools/*`) |

## Route architecture (paired docs)

Read in order: **AGENTS.md** → `***-architecture.md`** → `***-ui-map.md**` for the route you are changing.

## Admin routes


| Guide                                          | Route / topic         |
| ---------------------------------------------- | --------------------- |
| [admin-rental-links.md](admin-rental-links.md) | `/admin/rental-links` |
| [admin-users.md](admin-users.md)               | `/admin/users`        |


## Components (`src/lib/`)

Paired guides match component filenames (see SOP):


| Guide                                        | Component                  |
| -------------------------------------------- | -------------------------- |
| [RentalLandingGrid.md](RentalLandingGrid.md) | `RentalLandingGrid.svelte` |


## Kickdesk & KAM


| Guide                                                                                  | Topic                                                           |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| [kickdesk.registration.json](../../kickdesk.registration.json) + [KD setup for robots](../../kickdesk/docs/subscriber-setup-for-robots.md) | Kickdesk subscriber — one-sheet in KD repo; day-to-day: [README § Kickdesk](../../README.md#kickdesk-local-cockpit); values: `scripts/kickdesk-manifest.ts` |
| [kam-console.md](kam-console.md)                                                       | Dev console, `Ctrl+/`, klog, command palette                    |
| [register-kickagent-command.md](register-kickagent-command.md)                         | **Checklist:** add a `kickagent:*` command (catalog → KAM → hub) |
| [contracts/README.md](contracts/README.md)                                             | Cross-repo contract index and reading order                     |
| [contracts/publicweb-kickagent-consumer.md](contracts/publicweb-kickagent-consumer.md) | publicweb host/subscriber (phases, security, PW-owned commands) |
| [kickagent platform spec](../../kickagent/docs/kickagent-platform-spec.md)             | Manifest, ESM plugin, API (sibling repo `../kickagent`)         |
| [contracts/kickagent-essentials-spec.md](contracts/kickagent-essentials-spec.md)       | Phase 1 kickagent npm package contract                          |
| [contracts/kickagent-hello-world.md](contracts/kickagent-hello-world.md)               | Hello-world milestone (kickagent repo)                          |
| [contracts/publicweb-hello-world.md](contracts/publicweb-hello-world.md)               | Hello-world integration (publicweb repo)                        |


## Other notes in `docs/`

Files such as `General Dev Notes.md` or `Sloppy Dev Guide.md` may exist for ad-hoc notes; they are **not** part of the mandatory doc pipeline unless linked from the SOP or a route guide.