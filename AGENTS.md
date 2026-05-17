# AGENTS.md — publicweb

Entry point for **Cursor agents** and developers working in this repository.

## Project overview

Internal ops dashboard (authenticated home) plus rental marketing pages per city (`/cda`, `/mos`, `/spt`), vanity hosts, and admin tooling. Built with **SvelteKit** (Node adapter), **PostgreSQL** via **Drizzle ORM**, cookie sessions, and role-based access.

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

Prefer **Runes** in new and edited code: `$props()`, `$state()`, `$derived()`, `$effect()` instead of legacy `export let` and `$:` blocks. Run `pnpm check` before merging.

## Client UI settings store

- Shared client UI preferences live in `src/lib/client/uiSettings.svelte.ts`.
- Current persisted shape includes:
  - `consoleOpen` (KAM console visibility)
  - `billsDefaultTab` (`transactions | documents | postings`)
  - `kamMode` (`default | kickagent` — **[KA]** shell; enter with `shell kickagent`, or shortcut like `ka` via `alias kickagent ka`)
- KAM **command aliases** (`alias` / `unalias`; `publicweb.consoleUi` localStorage) live in `src/lib/client/consoleUi.svelte.ts` — separate key from UI settings; see [`docs/guides/kam-console.md`](docs/guides/kam-console.md).
  - When adding/removing/changing fields, bump `UI_SETTINGS_VERSION`.
  - Keep `DEFAULT_UI_SETTINGS` and validation (`isValidShape`) in sync with the new version.
- `/tools/bills` uses this store to resolve the last selected Bills sub-tab; fallback default is the first tab (`transactions`).

## Environment file

**Source of truth:** [`.env.example`](.env.example).

- **Required for local app + DB:** `DATABASE_URL`.
- **Seed script only:** `ADMIN_EMAIL`, `ADMIN_PASSWORD` (password not read by the running app after seeding).
- **Mail:** `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`; optional `SMTP_SECURE`; `ADMIN_EMAIL` as From; optional `MAIL_DEV_ONLY=true` to skip SMTP and log only; optional `PUBLIC_BASE_URL` for absolute links in emails.
- **Vanity hosts:** `PUBLIC_VANITY_HOST_CDA`, `PUBLIC_VANITY_HOST_MOS`, `PUBLIC_VANITY_HOST_SPT` as documented there.
- **Kickagent Phase 2 (optional):** `PUBLIC_KICKAGENT_MANIFEST_URL` — URL of `manifest.json` for browser plugin load; unset keeps Phase 1 static `registerKickagentHelloCommand` only ([`.env.example`](.env.example)).

Copy `.env.example` to `.env` and fill values; never commit real secrets.

## Database

- Apply migrations after pulling: `pnpm db:migrate`.
- First admin user: `pnpm seed:admin` (requires `DATABASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`).

## Documentation pipeline

- **Repository standards** for Svelte structure and file headers: [`docs/sop-svelte-and-components.md`](docs/sop-svelte-and-components.md).
- **Developer / agent guides** live under [`docs/guides/`](docs/guides/) — implementation notes and pointers for components and selected routes (these are **not** end-user FAQs).
- **Utility bill ETL scope** (email intake -> PDF parsing -> Appfolio CSV): [`docs/guides/utility-bill-etl-scope.md`](docs/guides/utility-bill-etl-scope.md).
- **KAM dev console + command palette** (palette: `Ctrl+/`; focus console pane: `` ` `` (backtick); `klog`, commands, refresh targets, per-user klog persistence): [`docs/guides/kam-console.md`](docs/guides/kam-console.md).
- **kickagent cross-repo contracts** (sibling package `../kickagent`): [`docs/guides/contracts/README.md`](docs/guides/contracts/README.md); publicweb host guide [`docs/guides/contracts/publicweb-kickagent-consumer.md`](docs/guides/contracts/publicweb-kickagent-consumer.md).
- **Human setup (local dev):** [README.md → Development](README.md#development).
- **Production operations (operators):** [`docs/guides/production-operations.md`](docs/guides/production-operations.md).
- **Docs index:** [`docs/guides/README.md`](docs/guides/README.md).

## Route doc order (required)

For any route work, read docs in this order:

1. **Global coordinator:** this file ([`AGENTS.md`](AGENTS.md))
2. **Route architecture doc:** `docs/guides/<route-scope>-architecture.md`
3. **Route UI doc:** `docs/guides/<route-scope>-ui-map.md`

Example for Tools > Bills:

1. [`AGENTS.md`](AGENTS.md)
2. [`docs/guides/tools-bills-architecture.md`](docs/guides/tools-bills-architecture.md)
3. [`docs/guides/tools-bills-ui-map.md`](docs/guides/tools-bills-ui-map.md)

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

Details: [`docs/sop-svelte-and-components.md`](docs/sop-svelte-and-components.md).
