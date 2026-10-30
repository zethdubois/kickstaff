# AGENTS.md — kickstaff

<!-- BEGIN proj-agents -->
**Default SOP:** [`~/fleet/harness/SOP.md`](/home/golem/fleet/harness/SOP.md) — read that first. Stub: [.agent/SOP.md](.agent/SOP.md) (pack [.agent/SOP_VERSION](.agent/SOP_VERSION)).

**Start here:** [docs/now.md](docs/now.md) → [docs/plan.md](docs/plan.md) (linked section only) → harness SOP.

**This file (below the pack markers):** project overrides, stack notes, and named shared/production stores. Project wins only where it explicitly overrides the harness SOP.
<!-- END proj-agents -->


Entry point for **Cursor agents** and developers working in this repository.

## Project overview

**Host contract (Kickagent):** [`../kickagent/docs/kickagent/architecture/frontend-guide.md`](../kickagent/docs/kickagent/architecture/frontend-guide.md). Kickstaff is the default frontend. Read that guide before changing how this repo loads Kickagent, passes a database, or runs a command. Do not add a second copy of that contract in this repo.

Authenticated **product shell**: production rental marketing (`/rent/cda`, `/rent/mos`, `/rent/spt`; old `/cda`, `/mos`, `/spt` redirect), team hub, admin for rental config, **KAM** host (command palette + console), and planned **KAM-UI** dashboards. **kickagent** (sibling repo) publishes the commands. This app holds users and passes the ops database. Built with **SvelteKit** (Node adapter), **PostgreSQL** via **Drizzle ORM**, cookie sessions, and role-based access.

**Platform split:** [docs/guides/platform-overview.md](docs/guides/platform-overview.md).

## Tooling

- **Package manager:** **pnpm** only (`packageManager` is pinned in `package.json`). Use `pnpm install`, `pnpm dev`, `pnpm build`, `pnpm check`.
- Do not use npm/yarn for installs or commit a `package-lock.json`.
- **Dev server URL:** `http://localhost:5000` — port is set in `vite.config.ts` (`server.port`, `strictPort`). If you change it, update Replit’s `.replit` port mapping so the preview still works.

Common scripts: `pnpm dev`, `pnpm build`, `pnpm check`, `pnpm db:migrate`, `pnpm seed:admin`, `pnpm seed:ops-datasets`, `pnpm list:users`, `pnpm run env:vanity`.

## SvelteKit environment variables

- **Server secrets:** `$env/dynamic/private` (e.g. `DATABASE_URL`, SMTP, `ADMIN_EMAIL`). Never import private env into client-facing code.
- **Public / client-safe:** only variables prefixed with `PUBLIC_` (e.g. vanity hostnames). See SvelteKit docs for `$env/static/public` and `$env/dynamic/public`.
- After changing `.env` locally, **restart** the dev server.

## Svelte 5 and Runes

Prefer **Runes** in new and edited code: `$props()`, `$state()`, `$derived()`, `$effect()` instead of legacy `export let` and `$:` blocks. Run `pnpm check` before merging.c

## Client UI settings store

- Shared client UI preferences live in `src/lib/client/uiSettings.svelte.ts`.
- Current persisted shape includes:
  - `consoleOpen` (KAM console visibility)
  - `listPrefs` (per list-detail resource: include-flags, column quick filters, sort — see `docs/guides/ops-accounts-ui-map.md`)
  - `activeNamespace` (empty = host; e.g. `kickagent` for **[KA]** palette — enter with `kickagent` / alias `ka`, leave with `:exit`; load with `load kickagent`)
- KAM **command aliases** (`alias` / `alias --remove`; `kickstaff.consoleUi` localStorage) live in `src/lib/client/consoleUi.svelte.ts` — separate key from UI settings; see `[docs/guides/kam-console.md](docs/guides/kam-console.md)`.
  - When adding/removing/changing fields, bump `UI_SETTINGS_VERSION`.
  - Keep `DEFAULT_UI_SETTINGS` and validation (`isValidShape`) in sync with the new version.

## Environment file

**Source of truth:** `[.env.example](.env.example)`.

- **Required for local app + product DB:** `DATABASE_URL_DEV` (`…:5043/kickstaff_dev`). `DATABASE_URL` is this deploy's product database (Railway), not the laptop default.
- **Admin seed / dev recovery:** `ADMIN_EMAIL`, `ADMIN_PASSWORD` (`pnpm seed:admin`). In non-production, the same password (or `DEV_ADMIN_BYPASS_PASSWORD`) is a master login for **admin** accounts when the stored hash does not match.
- **Mail:** `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`; optional `SMTP_SECURE`; `ADMIN_EMAIL` as From; optional `MAIL_DEV_ONLY=true` to skip SMTP and log only; optional `PUBLIC_BASE_URL` for absolute links in emails.
- **Vanity hosts:** `PUBLIC_VANITY_HOST_CDA`, `PUBLIC_VANITY_HOST_MOS`, `PUBLIC_VANITY_HOST_SPT` as documented there.
- **Kickagent Phase 2 (optional):** `PUBLIC_KICKAGENT_MANIFEST_URL` — URL of `manifest.json` for browser plugin load; unset uses Phase 1 linked-package catalog registration (`[.env.example](.env.example)`).

Copy `.env.example` to `.env` and fill values; never commit real secrets.

## Cursor / VS Code workspace (kickagent docs)

For permanent **read-only** access to sibling kickagent documentation, open the multi-root workspace file (not the folder alone):

**File → Open Workspace from File…** → [`kickstaff.code-workspace`](kickstaff.code-workspace)

| Root | Path | Purpose |
| ---- | ---- | ------- |
| `kickstaff` | this repo | App source (read/write) |
| `kickagent-docs` | `../kickagent/docs` | Architecture, commands, operations, wiki, and generated catalog (read-only; edit in kickagent) |

Requires sibling checkout at `../kickagent`. Workspace `files.readonlyInclude` marks the docs root read-only in the editor where supported. The generated command catalog lives at `kickagent/catalog/` inside that root (`pnpm docs:commands` in kickagent).

## Kickdesk

This app is a **Kickdesk subscriber** (local dev cockpit). **First-time setup:** `[kickdesk.registration.json](kickdesk.registration.json)` → KD `[docs/subscriber-setup-for-robots.md](../kickdesk/docs/subscriber-setup-for-robots.md)` (start here) + paths in `readonlyFiles`. **Day-to-day when-to-run:** [README.md → Kickdesk](README.md#kickdesk-local-cockpit).


| You did…                                                                                | Run                              |
| --------------------------------------------------------------------------------------- | -------------------------------- |
| Changed checkout path, ports, compose, workflow keys, or `scripts/kickdesk-manifest.ts` | `pnpm kickdesk:publish-manifest` |
| DB up, migrate, or pulled migrations                                                    | `pnpm db:migrate:status`         |


- **Registration:** `[kickdesk.registration.json](kickdesk.registration.json)`
- **Schema (readonly):** KD files listed in `kickdesk.registration.json` → `kickdeskSpec.readonlyFiles` (or `KICKDESK_ROOT`)
- **Values source:** `[scripts/kickdesk-manifest.ts](scripts/kickdesk-manifest.ts)` — do not copy KD sample manifest verbatim

## Database

- **Local dev:** `pnpm db:up` — **one** Docker Postgres on host port **5043**, **two databases**. Product: `DATABASE_URL_DEV` → `…/kickstaff_dev` (users, sessions, dataset rows). Ops: `…/kickagent_ops_dev` (sites, gl, units). The path is the database name, not a schema. Contract: [`../kickagent/docs/kickagent/architecture/frontend-guide.md`](../kickagent/docs/kickagent/architecture/frontend-guide.md). Default target is **dev** when `DATABASE_URL_DEV` is set. Explicit: `/login?db=…`, `--db`, KAM `db use` — [database-targeting.md](docs/guides/database-targeting.md). **Staging / prod:** one Postgres instance each, same split (`DATABASE_URL` = product, path `/kickagent_ops` = ops). Laptop: `DATABASE_URL_STAGING` is an optional product URL only. A fresh volume runs `scripts/postgres/init-ops-db.sh`. An existing volume does not; create the ops database once: `docker exec -i "$(docker ps -qf name=postgres)" psql -U postgres -c "CREATE DATABASE kickagent_ops_dev"` (ignore if it already exists). Then `pnpm db:migrate` in kickagent against that URL.
- Apply migrations after pulling: `pnpm db:migrate` (dev). Staging / production: `pnpm db:migrate --db staging` \| `--db prod` — use with care.
- First admin user: `pnpm seed:admin` (requires `ADMIN_EMAIL`; random temp password printed once). Target with `--db staging` \| `prod`. Rotate: `pnpm reset:admin-password --db …`. Forgot password: `/forgot-password`. Active target: `pnpm db:status` or KAM `db status`.
- **Per-DB sessions:** each database has its own sessions and its own cookie (`ka_session_<target>`); the target is resolved per request (`?db=` on login/reset pages > `kickstaff_db_target` preference cookie > default), never a process-global. Tiered timeouts (dev 7d; staging 7d/8h idle; prod 12h/30m idle, browser-session cookie). KAM `db use …` only sets the preference and sends you to that DB's login if you have no session — policy in `[docs/guides/database-targeting.md](docs/guides/database-targeting.md)`.

## Documentation pipeline

- **Repo Architecture Onboarding (Cursor skill):** [`.cursor/skills/repo-architecture-onboarding/SKILL.md`](.cursor/skills/repo-architecture-onboarding/SKILL.md) — doc ladder and architecture summary when cold-starting or before cross-cutting work.
- **Platform overview** (kickstaff vs kickagent, one Postgres instance / two databases, storage, KAM vs KAM-UI): `[docs/guides/platform-overview.md](docs/guides/platform-overview.md)`. Host contract stays the Kickagent frontend guide above. Do not add a second copy here. The subscriber-load brief is `load` / wiki / progress only.
- **Repository standards** for Svelte structure and file headers: `[docs/sop-svelte-and-components.md](docs/sop-svelte-and-components.md)`.
- **Developer / agent guides** live under `[docs/guides/](docs/guides/)` — implementation notes and pointers for components and selected routes (these are **not** end-user FAQs).
- **Operations handoff (kickagent):** `[docs/upgrade/README.md](docs/upgrade/README.md)` — primers + ETL reference (no bill code in this repo).
- **KAM dev console + command palette** (palette: `Ctrl+/`; focus console pane: ``` (backtick); `klog`, commands, refresh targets, per-user klog persistence): `[docs/guides/kam-console.md](docs/guides/kam-console.md)`.
- **Host mission (kickagent UI):** `[docs/guides/host-mission.md](docs/guides/host-mission.md)` — kickstaff is a generic manifest consumer; new same-class resources are a reload.
- **kickagent integration** (no npm/git dependency in kickstaff — Phase 2 manifest + ESM): sibling `../kickagent` only to publish/serve artifacts; `[docs/guides/contracts/kickstaff-kickagent-consumer.md](docs/guides/contracts/kickstaff-kickagent-consumer.md)`.
- **New kickagent command (checklist):** `[docs/guides/register-kickagent-command.md](docs/guides/register-kickagent-command.md)` — catalog in kickagent, auto-register in kickstaff, KAM verify, optional hub card.
- **Human setup (local dev):** [README.md → Development](README.md#development).
- **Production operations (operators):** `[docs/guides/production-operations.md](docs/guides/production-operations.md)`.
- **Kickdesk subscriber:** `[kickdesk.registration.json](kickdesk.registration.json)` + KD `[subscriber-setup-for-robots.md](../kickdesk/docs/subscriber-setup-for-robots.md)`; day-to-day [README → Kickdesk](README.md#kickdesk-local-cockpit).
- **Docs index:** `[docs/guides/README.md](docs/guides/README.md)`.

## Route doc order (required)

For any route work, read docs in this order:

1. **Global coordinator:** this file (`[AGENTS.md](AGENTS.md)`)
2. **Route architecture doc:** `docs/guides/<route-scope>-architecture.md`
3. **Route UI doc:** `docs/guides/<route-scope>-ui-map.md`

**Operations handoff (kickagent):** `[docs/upgrade/README.md](docs/upgrade/README.md)` — bills/units/reports primers after `/tools` removal.

## Route doc naming + depth

- Use kebab-case route-scope names that mirror URL segments.
- Route architecture docs: `docs/guides/<route-scope>-architecture.md`
- Route UI docs: `docs/guides/<route-scope>-ui-map.md`
- Optional area-level docs (cross-route only): `docs/guides/<area>-architecture.md`
- Keep a two-tier system by default (global + route-level docs).
- Add deeper sub-scope docs only when a route architecture doc grows too large or workflows become independently owned.

## Naming (summary)

- **Components:** PascalCase, `*.svelte` under `src/lib/`.
- **Routes:** SvelteKit conventions (`+page.svelte`, `+page.server.ts`, `+layout.svelte`, etc.); kebab-case path segments where applicable.
- **Server-only helpers:** `src/lib/server/*.ts` (no accidental client imports of secrets).

Details: `[docs/sop-svelte-and-components.md](docs/sop-svelte-and-components.md)`.
