# Database targeting (dev / staging / prod)

**Audience:** Developers and agents in **kickstaff**. Kickagent still uses `dev` | `prod` only — kickstaff maps `staging` → kickagent `prod` with the staging URL in the child env. See kickagent `docs/database-targeting.md` in the sibling repo.

## Problem we avoid

Do **not** resolve the active database with:

```ts
process.env.DATABASE_URL || process.env.DATABASE_URL_DEV
```

A shell-exported `DATABASE_URL` (e.g. Railway prod) would always win over `.env`’s `DATABASE_URL_DEV` when code used OR precedence. Both repos pick an explicit **target** (`dev` | `staging` | `prod`) and then read the matching URL only.

There is **no** `KICKSTAFF_DB_DEFAULT` — pick explicitly, or accept the inference below.

## Kickstaff model

Implementation:

| Area | Path |
| ---- | ---- |
| Shared resolution | [`src/lib/server/dbTargetCore.ts`](../../src/lib/server/dbTargetCore.ts) |
| Running dev server | [`src/lib/server/dbTarget.ts`](../../src/lib/server/dbTarget.ts), [`src/lib/server/db.ts`](../../src/lib/server/db.ts) |
| CLI scripts | [`scripts/lib/dbCli.ts`](../../scripts/lib/dbCli.ts) |
| Drizzle Kit | [`drizzle.config.ts`](../../drizzle.config.ts) |
| KAM console | `db status`, `db use …` — [kam-console.md](kam-console.md) |

| Concept | Behavior |
| ------- | -------- |
| **Default (local)** | `dev` if `DATABASE_URL_DEV` is set, else `prod`. |
| **Default (deploy)** | Railway env name (`RAILWAY_ENVIRONMENT_NAME` / `RAILWAY_ENVIRONMENT`): names that look like staging → `staging`, else `prod`. Cookie / `?db=` switching disabled. |
| **Explicit local picks** | `/login?db=dev\|staging\|prod` (sets the preference cookie); KAM `db use …` (any signed-in user — it only changes the preference, see below); CLI `--db …`. |
| **Request target** | Resolved per request in `hooks.server.ts` (`?db=` on `/login`, `/forgot-password`, `/reset-password` > `kickstaff_db_target` cookie > default) and carried in `AsyncLocalStorage` — there is no process-global "active DB". Each target has its own connection pool. |

### Sessions and switching (security policy)

**The database is a credential boundary.** Every database has its own `users` and `sessions` tables, and the browser holds one session cookie *per database* (`ka_session_dev`, `ka_session_staging`, `ka_session_prod`). A session token is only ever checked against the DB named by its own cookie, so a login on dev proves nothing on prod.

- `kickstaff_db_target` is **only a preference** (which DB this tab talks to). It grants nothing. Switching to a DB you hold no session for lands you on that DB's `/login`; your other sessions are untouched, so hopping between DBs you already signed into costs zero logins.
- `db use …` / `?db=` therefore need **no super-user gate**; the gate is "can you authenticate in that DB". Super user (`ADMIN_EMAIL`) is no longer part of DB switching.
- Table/migration inspection (`db tables`, `db migrations`) is **admin role only** on the target DB.
- On deploys (`NODE_ENV=production`) the target is fixed by the Railway env name; cookie and `?db=` are ignored.

Session lifetime by tier (`sessionPolicyForTarget` in `dbTargetCore.ts`):

| Target | Absolute | Idle timeout | Cookie |
| ------ | -------- | ------------ | ------ |
| `dev` | 7 days | none | persistent |
| `staging` | 7 days | 8 hours | persistent |
| `prod` | 12 hours | 30 minutes | browser-session (gone when the browser closes) |

Idle time is tracked in `sessions.last_seen_at` (touched at most once a minute). Sign out: account menu → **Sign out** (current DB only) or **Sign out everywhere** (every DB's session in this browser; deletes them server-side).
| **Connection** | `dev` → `DATABASE_URL_DEV`; `staging` → `DATABASE_URL_STAGING` (laptop) or deploy `DATABASE_URL` when Railway env is staging; `prod` → `DATABASE_URL`. |

### Environment (local)

[`.env.example`](../../.env.example):

```env
DATABASE_URL_DEV=postgresql://postgres:postgres@localhost:5043/kickstaff_dev
# DATABASE_URL_STAGING=postgresql://...   # Railway staging (laptop migrate/seed / db use staging)
# DATABASE_URL=postgresql://...           # optional locally; required for prod target / db use prod
```

No `KICKSTAFF_DB_DEFAULT`. Use `/login?db=…` or `--db` when you need a non-default target.

### Environment (Railway)

| Deploy | Vars |
| ------ | ---- |
| **Production** | `DATABASE_URL` (plugin). Railway env name e.g. `production`. Badge: **prod**. |
| **Staging** | `DATABASE_URL` (staging Postgres). Railway env name containing `stag` (e.g. `staging`). Badge: **staging**. |

Laptop → staging: set `DATABASE_URL_STAGING` to the staging public URL, then `pnpm db:migrate --db staging` / `pnpm seed:admin --db staging`, or open `/login?db=staging`.

### Commands

| Task | Command |
| ---- | ------- |
| Check CLI default + connection | `pnpm db:status` |
| Check staging / prod from laptop | `pnpm db:status --db staging` · `pnpm db:status --db prod` |
| Check runtime target (app) | KAM `db status` |
| Migrate | `pnpm db:migrate` · `--db staging` · `--db prod` |
| Login against a DB (pre-auth) | `/login?db=dev` \| `staging` \| `prod` |
| Switch running local server | KAM `db use …` (needs a sign-in on the target DB; opens its login if none) |

**Explicit CLI target:** `--db` > positional > inferred default. `-db` is accepted as an alias for `--db`.

`pnpm db:migrate` passes `DRIZZLE_DATABASE_URL` into the drizzle-kit child so `--db …` uses the same URL as the wrapper.

## Kickagent comparison

| | **Kickstaff** | **Kickagent** |
| --- | --- | --- |
| Default | Infer + Railway env name | `KICKAGENT_DB_DEFAULT` |
| Targets | `dev` \| `staging` \| `prod` | `dev` \| `prod` only |
| Pre-auth pick | `/login?db=…` | n/a |

When kickstaff spawns kickagent against **staging**, it passes `--db prod` and sets the child’s `DATABASE_URL` to the staging connection string.

## Troubleshooting

| Symptom | Likely cause |
| ------- | ------------ |
| Wrong password after local reset | Browser still on another DB — open `/login?db=dev` |
| Everyone signed out after upgrading | One-time: session cookies were renamed per DB (`ka_session` → `ka_session_<target>`); sign in once per DB |
| `last_seen_at` column missing | Migration `0022_sessions_last_seen` not applied to that DB (`pnpm db:migrate --db …`) — **apply before deploying** |
| Drizzle skipped a migration | It only applies entries whose journal `when` is newer than the DB's latest applied row; keep new entries' `when` above every DB's max |
| Staging deploy badge says **prod** | Railway environment name does not look like staging (rename env or check `RAILWAY_ENVIRONMENT_NAME`) |
| `DATABASE_URL_STAGING is not set` | Local `--db staging` / `?db=staging` needs that var |
| App vs CLI differ | Cookie / `?db=` vs CLI default — check KAM `db status` vs `pnpm db:status` |
