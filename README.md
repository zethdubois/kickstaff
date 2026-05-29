# publicweb — Kick Asset Management

SvelteKit app for **rental marketing pages** (CDA, Moscow, Sandpoint) with optional vanity hosts, an authenticated **ops hub**, **admin** tooling (`/admin`), **settings** (dashboard links), and the **KAM** console (command palette + kickagent integration). Office operations (bills, units) move to **kickagent** — see [platform overview](docs/guides/platform-overview.md) and [upgrade primers](docs/upgrade/README.md).

## Tech stack

- **Framework:** SvelteKit (Node adapter)
- **Package manager:** pnpm
- **Database:** PostgreSQL via Drizzle ORM
- **Session auth:** Cookie-based with bcrypt password hashing
- **Hosting:** Railway

## Repository layout

```
src/
├── routes/
│   ├── cda/             # Coeur d'Alene rental page
│   ├── mos/             # Moscow rental page
│   ├── spt/             # Sandpoint rental page
│   ├── admin/           # Admin tooling (rental links, users)
├── lib/
│   ├── client/          # Client-side stores (UI settings)
│   ├── server/          # DB schema, auth, guards, upsert logic
│   ├── RentalLandingGrid.svelte   # Main rental page layout
│   ├── RentalLandingFrame.svelte  # Hero/headline/body column
│   ├── RentalWysiwygGear.svelte   # Admin WYSIWYG theme panel
│   └── RentalContactModal.svelte  # Contact form modal
└── hooks.server.ts      # Auth gate + vanity host bypass
```

## Development

### Prerequisites

| Requirement | Notes |
|-------------|--------|
| **Node.js** | LTS 20+ or 22+ |
| **pnpm** | Pinned in `package.json` (`packageManager`). Use [Corepack](https://pnpm.io/installation): `corepack enable` |
| **Docker** | Engine required; Compose optional (`pnpm db:up` falls back to `docker run`). Install Compose: `sudo apt install docker-compose-v2` |
| **PostgreSQL** | Prod URL in `DATABASE_URL`; local dev uses `DATABASE_URL_DEV` |
| **kickagent** (optional local) | Sibling repo at `../kickagent` for `serve-publish` + manifest URL in `.env` — not an npm dependency of publicweb |

Do **not** use npm or yarn; do not commit `package-lock.json`.

### First-time setup

```bash
pnpm install
cp .env.example .env
# Edit .env — DATABASE_URL (prod), DATABASE_URL_DEV (local), ADMIN_EMAIL, ADMIN_PASSWORD
pnpm db:up
pnpm db:migrate
pnpm seed:admin
```

**Database** — local dev uses Docker Postgres on **host port `5043`** (`DATABASE_URL_DEV` in `.env`; container listens on 5432 internally). Part of the KAM **50xx** port family (see kickdesk `docs/DEV_PORTS.md`). Production deploy uses `DATABASE_URL` only. After pulling migrations, run `pnpm db:migrate` again. Check active target: `pnpm db:status` or KAM `db status`.

### Kickdesk (local cockpit)

Kickdesk reads **`~/.config/publicweb/`** (not files in this repo). First-time subscriber setup: [`kickdesk.registration.json`](kickdesk.registration.json) → Kickdesk [`docs/subscriber-setup-for-robots.md`](../kickdesk/docs/subscriber-setup-for-robots.md) (sibling repo or `KICKDESK_ROOT`). Ports/commands values: [`scripts/kickdesk-manifest.ts`](scripts/kickdesk-manifest.ts).

**When to run** (day-to-day):

| You did… | Run |
|----------|-----|
| Changed checkout path, dev ports, compose host port, workflow keys, or manifest command strings (`scripts/kickdesk-manifest.ts`) | `pnpm kickdesk:publish-manifest` |
| DB up, `pnpm db:migrate`, or pulled new migrations | `pnpm db:migrate:status` |
| Fresh machine / clone (once) | Both — publish manifest, then migrate-status with DB up |

`pnpm db:migrate` does **not** require publish-manifest unless you also changed the Kickdesk manifest source.

### Dev ports (50xx family)

| Role | Port |
|------|------|
| HTTP (Vite) | 5000 |
| Postgres (host) | 5043 |
| kickagent manifest (sibling) | 7099 |

**Admin seed** — `pnpm seed:admin` creates the user from `ADMIN_EMAIL` / `ADMIN_PASSWORD`; sign in at `/login`. List users: `pnpm list:users`.

Full environment reference: [`.env.example`](.env.example).

### Run locally

```bash
pnpm dev
```

- **URL:** [http://localhost:5000](http://localhost:5000) (port `5000` in `vite.config.ts`)
- Restart the dev server after any `.env` change

| URL | Purpose |
|-----|---------|
| `http://localhost:5000/` | Ops hub (requires login) |
| `http://localhost:5000/login` | Sign in |
| `http://localhost:5000/cda`, `/mos`, `/spt` | City rental pages |
| `http://localhost:5000/admin/rental-links` | Rental links editor |

### Common commands

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Dev server |
| `pnpm build` | Production build |
| `pnpm start` | Run production build |
| `pnpm check` | Typecheck / Svelte check |
| `pnpm db:up` | Start local Docker Postgres |
| `pnpm db:down` | Stop local Docker Postgres |
| `pnpm db:status` | Show active DB target + connectivity (`-- --db prod` for Railway) |
| `pnpm db:migrate` | Apply migrations (dev DB by default; `-- --db prod` for production) |
| `pnpm db:studio` | Drizzle Studio |
| `pnpm seed:admin` | Create/update seed admin |
| `pnpm list:users` | List DB users |
| `pnpm run env:vanity` | Print vanity host env |
| `pnpm kickdesk:publish-manifest` | Publish Kickdesk manifest to `~/.config/publicweb/` |
| `pnpm db:migrate:status` | Migration status for Kickdesk (`ok` / `pending:N`); also writes `~/.config/publicweb/migrate-status` |

### Optional local setup

- **Vanity hosts** — set `PUBLIC_VANITY_HOST_*` in `.env` (e.g. `PUBLIC_VANITY_HOST_MOS=moscow.localhost`), run `pnpm run env:vanity`, open `http://moscow.localhost:5000/`
- **Mail** — `MAIL_DEV_ONLY=true` logs mail to the console; otherwise configure `SMTP_*` in `.env`
- **Agent impersonation** — non-production only: set `AGENT_EMAIL`, visit `http://localhost:5000/?as_agent=1`

### Troubleshooting

| Symptom | Check |
|---------|--------|
| KAM / kickagent commands empty | Set `PUBLIC_KICKAGENT_MANIFEST_URL` (HTTPS manifest + ESM on kickagent host); run `kam:reload-kickagent` after republish |
| Login 500 / DATABASE_URL | `.env`, `pnpm db:up`, `DATABASE_URL_DEV` uses port **5043**, `pnpm db:migrate` |
| Port 5432 already in use | Dev DB uses **5043** — match `DATABASE_URL_DEV` in `.env` to `.env.example` |
| Port in use | Free port `5000` or change `vite.config.ts` |
| Vanity host wrong page | `pnpm run env:vanity`; hostname matches env |
| Stale config | Restart `pnpm dev` after `.env` edits |

## Documentation

- **[docs/guides/platform-overview.md](docs/guides/platform-overview.md)** — publicweb vs kickagent, Postgres schemas, storage, KAM / KAM-UI
- **[docs/upgrade/README.md](docs/upgrade/README.md)** — handoff primers for bills/units/reports (ex–`/tools`)
- **[AGENTS.md](AGENTS.md)** — Cursor agents and contributors: conventions, env summary, route-doc pipeline, Svelte 5 runes
- **[docs/guides/README.md](docs/guides/README.md)** — index of route architecture, admin dev guides, ETL, KAM console
- **[docs/sop-svelte-and-components.md](docs/sop-svelte-and-components.md)** — Svelte file headers and guide naming

## Production

Live ops hub: **https://www.kickassetmanagement.com**. Operator guide (vanity domains, AppFolio links, admin workflows): **[docs/guides/production-operations.md](docs/guides/production-operations.md)**.
