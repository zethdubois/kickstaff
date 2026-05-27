# AGENTS.md — publicweb

Entry point for **Cursor agents** and developers working in this repository.

## Project overview

Authenticated **product shell**: production rental marketing (`/cda`, `/mos`, `/spt`), team hub, admin for rental config, **KAM** host (command palette + console), and planned **KAM-UI** dashboards. **kickagent** (sibling repo) owns office operations logic and the `**operations`** Postgres schema target. Built with **SvelteKit** (Node adapter), **PostgreSQL** via **Drizzle ORM**, cookie sessions, and role-based access.

**Platform split:** [docs/guides/platform-overview.md](docs/guides/platform-overview.md).

## Tooling

- **Package manager:** **pnpm** only (`packageManager` is pinned in `package.json`). Use `pnpm install`, `pnpm dev`, `pnpm build`, `pnpm check`.
- Do not use npm/yarn for installs or commit a `package-lock.json`.
- **Dev server URL:** `http://localhost:5000` — port is set in `vite.config.ts` (`server.port`, `strictPort`). If you change it, update Replit’s `.replit` port mapping so the preview still works.

Common scripts: `pnpm dev`, `pnpm build`, `pnpm check`, `pnpm db:migrate`, `pnpm seed:admin`, `pnpm list:users`, `pnpm run env:vanity`.

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
  - `kamMode` (`default | kickagent` — **[KA]** shell; enter with `shell kickagent`, or shortcut like `ka` via `alias kickagent ka`)
- KAM **command aliases** (`alias` / `unalias`; `publicweb.consoleUi` localStorage) live in `src/lib/client/consoleUi.svelte.ts` — separate key from UI settings; see `[docs/guides/kam-console.md](docs/guides/kam-console.md)`.
  - When adding/removing/changing fields, bump `UI_SETTINGS_VERSION`.
  - Keep `DEFAULT_UI_SETTINGS` and validation (`isValidShape`) in sync with the new version.

## Environment file

**Source of truth:** `[.env.example](.env.example)`.

- **Required for local app + DB:** `DATABASE_URL`.
- **Seed script only:** `ADMIN_EMAIL`, `ADMIN_PASSWORD` (password not read by the running app after seeding).
- **Mail:** `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`; optional `SMTP_SECURE`; `ADMIN_EMAIL` as From; optional `MAIL_DEV_ONLY=true` to skip SMTP and log only; optional `PUBLIC_BASE_URL` for absolute links in emails.
- **Vanity hosts:** `PUBLIC_VANITY_HOST_CDA`, `PUBLIC_VANITY_HOST_MOS`, `PUBLIC_VANITY_HOST_SPT` as documented there.
- **Kickagent Phase 2 (optional):** `PUBLIC_KICKAGENT_MANIFEST_URL` — URL of `manifest.json` for browser plugin load; unset uses Phase 1 linked-package catalog registration (`[.env.example](.env.example)`).

Copy `.env.example` to `.env` and fill values; never commit real secrets.

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

- **Local dev:** `pnpm db:up` (Docker Postgres on host port **5043**), `DATABASE_URL_DEV` in `.env` (e.g. `localhost:5043/publicweb_dev`); default target: `PUBLICWEB_DB_DEFAULT=dev` or infer dev when `DATABASE_URL_DEV` is set — [database-targeting.md](docs/guides/database-targeting.md). **Prod:** `DATABASE_URL` on Railway only. Port map: kickdesk [DEV_PORTS](https://github.com/Kick-Asset-Management/kickdesk/blob/main/docs/DEV_PORTS.md) (50xx family).
- Apply migrations after pulling: `pnpm db:migrate` (dev). `pnpm db:migrate:prod` hits production — use with care.
- First admin user: `pnpm seed:admin` (requires `ADMIN_EMAIL`, `ADMIN_PASSWORD`). Active target: `pnpm db:status` or KAM `db status`.
- Super-only runtime switch (local dev): KAM `db use prod` / `db use dev` — see `[docs/guides/kam-console.md](docs/guides/kam-console.md)`.

## Documentation pipeline

- **Repo Architecture Onboarding (Cursor skill):** [`.cursor/skills/repo-architecture-onboarding/SKILL.md`](.cursor/skills/repo-architecture-onboarding/SKILL.md) — doc ladder and architecture summary when cold-starting or before cross-cutting work.
- **Platform overview** (publicweb vs kickagent, one DB / two schemas, storage, KAM vs KAM-UI): `[docs/guides/platform-overview.md](docs/guides/platform-overview.md)`.
- **Repository standards** for Svelte structure and file headers: `[docs/sop-svelte-and-components.md](docs/sop-svelte-and-components.md)`.
- **Developer / agent guides** live under `[docs/guides/](docs/guides/)` — implementation notes and pointers for components and selected routes (these are **not** end-user FAQs).
- **Operations handoff (kickagent):** `[docs/upgrade/README.md](docs/upgrade/README.md)` — primers + ETL reference (no bill code in this repo).
- **KAM dev console + command palette** (palette: `Ctrl+/`; focus console pane: ``` (backtick); `klog`, commands, refresh targets, per-user klog persistence): `[docs/guides/kam-console.md](docs/guides/kam-console.md)`.
- **kickagent cross-repo contracts** (sibling package `../kickagent`): `[docs/guides/contracts/README.md](docs/guides/contracts/README.md)`; publicweb host guide `[docs/guides/contracts/publicweb-kickagent-consumer.md](docs/guides/contracts/publicweb-kickagent-consumer.md)`.
- **New kickagent command (checklist):** `[docs/guides/register-kickagent-command.md](docs/guides/register-kickagent-command.md)` — catalog in kickagent, auto-register in publicweb, KAM verify, optional hub card.
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