# AGENTS.md — publicweb

Entry point for **Cursor agents** and developers working in this repository.

## Project overview

Internal ops dashboard (authenticated home) plus rental marketing pages per city (`/cda`, `/mos`, `/spt`), vanity hosts, and admin tooling. Built with **SvelteKit** (Node adapter), **PostgreSQL** via **Drizzle ORM**, cookie sessions, and role-based access.

## Tooling

- **Package manager:** **pnpm** only (`packageManager` is pinned in `package.json`). Use `pnpm install`, `pnpm dev`, `pnpm build`, `pnpm check`.
- Do not use npm/yarn for installs or commit a `package-lock.json`.

Common scripts: `pnpm dev`, `pnpm build`, `pnpm check`, `pnpm db:migrate`, `pnpm seed:admin`, `pnpm list:users`, `pnpm run env:vanity`.

## SvelteKit environment variables

- **Server secrets:** `$env/dynamic/private` (e.g. `DATABASE_URL`, SMTP, `ADMIN_EMAIL`). Never import private env into client-facing code.
- **Public / client-safe:** only variables prefixed with `PUBLIC_` (e.g. vanity hostnames). See SvelteKit docs for `$env/static/public` and `$env/dynamic/public`.
- After changing `.env` locally, **restart** the dev server.

## Svelte 5 and Runes

Prefer **Runes** in new and edited code: `$props()`, `$state()`, `$derived()`, `$effect()` instead of legacy `export let` and `$:` blocks. Run `pnpm check` before merging.

## Environment file

**Source of truth:** [`.env.example`](.env.example).

- **Required for local app + DB:** `DATABASE_URL`.
- **Seed script only:** `ADMIN_EMAIL`, `ADMIN_PASSWORD` (password not read by the running app after seeding).
- **Mail:** `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`; optional `SMTP_SECURE`; `ADMIN_EMAIL` as From; optional `MAIL_DEV_ONLY=true` to skip SMTP and log only; optional `PUBLIC_BASE_URL` for absolute links in emails.
- **Vanity hosts:** `PUBLIC_VANITY_HOST_CDA`, `PUBLIC_VANITY_HOST_MOS`, `PUBLIC_VANITY_HOST_SPT` as documented there.

Copy `.env.example` to `.env` and fill values; never commit real secrets.

## Database

- Apply migrations after pulling: `pnpm db:migrate`.
- First admin user: `pnpm seed:admin` (requires `DATABASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`).

## Documentation pipeline

- **Repository standards** for Svelte structure and file headers: [`docs/sop-svelte-and-components.md`](docs/sop-svelte-and-components.md).
- **Developer / agent guides** live under [`docs/guides/`](docs/guides/) — implementation notes and pointers for components and selected routes (these are **not** end-user FAQs).
- **Utility bill ETL scope** (email intake -> PDF parsing -> Appfolio CSV): [`docs/guides/utility-bill-etl-scope.md`](docs/guides/utility-bill-etl-scope.md).
- **KAM dev console + command palette** (hotkey `Ctrl+/`, `klog`, commands, refresh targets, per-user klog persistence): [`docs/guides/kam-console.md`](docs/guides/kam-console.md).
- **Docs index:** [`docs/README.md`](docs/README.md).

## Naming (summary)

- **Components:** PascalCase, `*.svelte` under `src/lib/`.
- **Routes:** SvelteKit conventions (`+page.svelte`, `+page.server.ts`, `+layout.svelte`, etc.); kebab-case path segments where applicable.
- **Server-only helpers:** `src/lib/server/*.ts` (no accidental client imports of secrets).

Details: [`docs/sop-svelte-and-components.md`](docs/sop-svelte-and-components.md).
