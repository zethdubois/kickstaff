# Database targeting (dev vs prod)

**Audience:** Developers and agents in **publicweb**. Kickagent uses the same env var names and resolution rules with `KICKAGENT_DB_DEFAULT` — see kickagent `docs/database-targeting.md` in the sibling repo.

## Problem we avoid

Do **not** resolve the active database with:

```ts
process.env.DATABASE_URL || process.env.DATABASE_URL_DEV
```

A shell-exported `DATABASE_URL` (e.g. Railway prod) would always win over `.env`’s `DATABASE_URL_DEV` when code used OR precedence. Both repos pick an explicit **target** (`dev` | `prod`) and then read the matching URL only.

## Publicweb model

Implementation:

| Area | Path |
| ---- | ---- |
| Shared resolution | [`src/lib/server/dbTargetCore.ts`](../../src/lib/server/dbTargetCore.ts) |
| Running dev server | [`src/lib/server/dbTarget.ts`](../../src/lib/server/dbTarget.ts), [`src/lib/server/db.ts`](../../src/lib/server/db.ts) |
| CLI scripts | [`scripts/lib/dbCli.ts`](../../scripts/lib/dbCli.ts) |
| Drizzle Kit | [`drizzle.config.ts`](../../drizzle.config.ts) |
| KAM console | `db status`, `db use dev` \| `db use prod` — [kam-console.md](kam-console.md) |

| Concept | Behavior |
| ------- | -------- |
| **Default target** | `PUBLICWEB_DB_DEFAULT` (`dev` \| `prod`), else infer `dev` if `DATABASE_URL_DEV` is set, else `prod`. |
| **Production runtime** | `NODE_ENV=production` → **always `prod`**, only `DATABASE_URL`. Cookie switching disabled. |
| **Runtime override** | Super user: `db use dev` \| `db use prod` (httpOnly cookie `publicweb_db_target`) on local dev server only. |
| **Connection** | `dev` → `DATABASE_URL_DEV`; `prod` → `DATABASE_URL`. |

### Environment (local)

[`.env.example`](../../.env.example):

```env
PUBLICWEB_DB_DEFAULT=dev
DATABASE_URL_DEV=postgresql://postgres:postgres@localhost:5043/publicweb_dev
# DATABASE_URL=postgresql://...   # optional locally; required for prod target / db use prod
```

Production deploy: `PUBLICWEB_DB_DEFAULT=prod` (or unset), `DATABASE_URL` set, **no** `DATABASE_URL_DEV`.

### Commands

| Task | Command |
| ---- | ------- |
| Check CLI default + connection | `pnpm db:status` |
| Check prod from laptop | `pnpm db:status -- --db prod` |
| Check runtime target (app) | KAM `db status` |
| Migrate dev | `pnpm db:migrate` |
| Migrate prod | `pnpm db:migrate -- --db prod` (or `pnpm db:migrate -- prod`) |
| Migration pending (Kickdesk) | `pnpm db:migrate:status` (dev default); prod: `pnpm db:migrate:status -- --db prod` |
| Switch running dev server | KAM `db use dev` \| `db use prod` (super only) |

**Explicit CLI target** (same idea as kickagent `--db`): pass `--db dev` or `--db prod` after `--` so pnpm forwards args to the script. Precedence: `--db` > positional `dev`/`prod` > env default (`PUBLICWEB_DB_DEFAULT`, etc.).

`pnpm db:status` without `--db` uses **env default** (not the KAM cookie). After `db use prod`, the app uses prod until switched back.

`pnpm db:migrate` passes `DRIZZLE_DATABASE_URL` into the drizzle-kit child so `--db prod` uses the same URL as the wrapper (not only env default). `db:generate`, `db:studio`, and `db:push` still use **env default only** via [`drizzle.config.ts`](../../drizzle.config.ts) — no `--db` flag on those commands.

## Kickagent comparison

| | **Publicweb** | **Kickagent** |
| --- | --- | --- |
| Default env | `PUBLICWEB_DB_DEFAULT` | `KICKAGENT_DB_DEFAULT` |
| Switching | `--db dev` \| `--db prod` on CLI scripts; cookie on dev server | `--db dev` \| `--db prod` per CLI process |
| Shared logic | `dbTargetCore.ts` | `src/db/dbTarget.ts` |

When publicweb runs kickagent handlers that touch Postgres on the server, the host should pass `getActiveDbTarget()` into kickagent context (planned) so both use the same target.

## Troubleshooting

| Symptom | Likely cause |
| ------- | ------------- |
| `database "kickasset" does not exist` | Shell `DATABASE_URL` points at prod; set `PUBLICWEB_DB_DEFAULT=dev`, unset exported `DATABASE_URL`, or `pnpm db:status`. |
| Migrate/seed hits wrong DB | Wrong default; use `pnpm db:migrate -- --db prod` explicitly or fix `PUBLICWEB_DB_DEFAULT`. |
| App vs CLI differ | Cookie override (`db use prod`) vs env default — check KAM `db status` vs `pnpm db:status`. |
