# Data ops log

Append-only record of **writes to shared or production data** (migrations, backfills, direct updates, seeds against a shared DB). Newest entry first.

Local throwaway databases do not need an entry. This is not a code changelog and not a migration runbook — link the runbook; keep restore facts here.

**Rule (agents and humans):**

1. **Back up first** to `~/backups/<project>/<store>/<YYYY-MM-DD>_<slug>/` on the host that runs the write. Never `/tmp` (wiped on reboot) or the git repo (dumps hold user data). Lossless format (e.g. Mongo extended JSON, `pg_dump`) plus `SHA256SUMS`. Keep a copy of the script that performed the write. Do **not** Syncthing backup trees into `~/fleet`.
2. **Dry-run, then apply.** Agents never auto-run a shared-data write — explicit human approval first.
3. **Log it in the same session.** An operation is not finished until its entry exists below.

Record **paths and checksums**, never connection strings or secrets.

Project `AGENTS.md` should name which stores count as shared/production for this repo.

---

## Entry template

Copy below the rules; fill in; leave older entries intact.

### YYYY-MM-DD — `<slug>`

| Field | Value |
|-------|--------|
| Who / host | `[c]` / `[oc]` / `[h]` · hostname |
| Script | path in repo or under `~/backups/...` |
| Scope | DB / tenants · collections or tables · record counts |
| Backup | `~/backups/<project>/...` · checksum (see `SHA256SUMS`) |
| What changed | short factual summary |
| Verified how | e.g. re-run dry-run touches 0 records |
| Data lost or overwritten | quote identifiers / counts; or **none** |
| Restore | runnable snippet or link to steps |
| Follow-ups | open items, or **none** |
| Runbook | link to how-to doc (not duplicated here) |

---

## Log

### 2026-10-30 — `prod-seed-users-max-otto`

| Field | Value |
|-------|--------|
| Who / host | `[c]` · Enki |
| Script | `scripts/seed-users.ts` via `pnpm seed:users --db prod …` |
| Scope | Prod product DB @ sakura…; table `users`; inserted 2 admin rows |
| Backup | `~/backups/kickstaff/prod/2026-10-30_seed-users/` · see `SHA256SUMS` (`users.before.json` / `users.after.json`) |
| What changed | Created `max@kickassetmanagement.com` and `n.ottonielson@gmail.com` as `admin` (`must_change_password=true`) |
| Verified how | `pnpm list:users --db prod` → 3 users including both new emails |
| Data lost or overwritten | **none** |
| Restore | `DELETE FROM users WHERE email IN ('max@kickassetmanagement.com','n.ottonielson@gmail.com');` (or re-load from before dump if needed) |
| Follow-ups | SMTP BadCredentials from laptop — temp passwords printed once in terminal, not logged here. Local/dev also got `n.ottonielson@gmail.com` (`max@` already existed). |
| Runbook | Human asked seed both emails on prod + dev |

### 2026-10-30 — `prod-reset-admin-password`

| Field | Value |
|-------|--------|
| Who / host | `[c]` · Enki |
| Script | `pnpm reset:admin-password --db prod` |
| Scope | Prod product DB @ sakura…; user `ADMIN_EMAIL`; password rotated, `must_change_password=true` |
| Backup | Waived (credential rotate only) |
| What changed | New password hash for existing admin (seed was no-op: user already existed) |
| Verified how | Script reported updated |
| Data lost or overwritten | Previous password hash for that user |
| Restore | Reset again or Forgot password |
| Follow-ups | Temp password printed once in terminal; not logged here |
| Runbook | Human asked new admin on prod |

### 2026-10-30 — `prod-seed-admin-and-ops-datasets`

| Field | Value |
|-------|--------|
| Who / host | `[c]` · Enki |
| Script | `CREATE DATABASE kickagent_ops`; `pnpm seed:admin --db prod`; `pnpm seed:ops-datasets --db prod` |
| Scope | Prod product DB @ sakura…; created sibling DB `kickagent_ops`; inserted admin user for `ADMIN_EMAIL`; inserted `ops_datasets` row `prod` → path `/kickagent_ops` |
| Backup | Waived earlier this session for this greenfield DB |
| What changed | New DB `kickagent_ops`; 1 admin user; 1 ops_datasets row |
| Verified how | Script output: admin created; ops insert reported `/kickagent_ops` |
| Data lost or overwritten | **none** |
| Restore | Drop user / ops row / DB as needed; re-run seeds |
| Follow-ups | SMTP from laptop failed (BadCredentials) — temp password printed once in terminal; rotate via Forgot password if lost. Kickagent ops schema still needs migrate against `…/kickagent_ops` if remote commands will use it. |
| Runbook | Human asked for admin + ops-datasets seed |

### 2026-10-30 — `prod-migrate-and-rental-landing-links`

| Field | Value |
|-------|--------|
| Who / host | `[c]` · Enki |
| Script | `pnpm db:migrate --db prod`; Node upsert (same pattern as staging copy) |
| Scope | Prod **product** DB (`railway` @ sakura…); full schema migrate 0000–0024; table `rental_landing_links` 3 rows (`cda`, `mos`, `spt`) from local `kickstaff_dev` |
| Backup | Human waived formal dump. Artifacts: `~/backups/kickstaff/prod/2026-10-30_rental-landing-links-dev-to-prod/` · after sha256 `49df23bbb9bec5865fcf587f5a296028217ceeb94366697532705cdeb49be4d9` |
| What changed | Empty DB → migrated; upserted full `rental_landing_links` from local (prod had 0 rows) |
| Verified how | `pnpm db:status --db prod` → migrations ok; post-apply select 3 slugs; key URL/headline fields match source |
| Data lost or overwritten | **none** (table was empty) |
| Restore | Delete rows or re-upsert from `rental_landing_links.dev-source.json` in that backup dir |
| Follow-ups | Confirm Railway kickstaff production `DATABASE_URL` is this same Postgres (sakura public / matching internal). Empty greenfield: still need `pnpm seed:admin --db prod` and `pnpm seed:ops-datasets --db prod` if this is the live product DB. |
| Runbook | Human asked seed + waived backups |

### 2026-10-30 — `rental-landing-links-dev-to-staging`

| Field | Value |
|-------|--------|
| Who / host | `[c]` · Enki |
| Script | `~/backups/kickstaff/staging/2026-10-30_rental-landing-links-dev-to-staging/copy-rental-landing-links.mjs` |
| Scope | Staging **product** DB (`railway` @ tokaido…); table `rental_landing_links`; 3 rows (`cda`, `mos`, `spt`) copied from local product `kickstaff_dev` |
| Backup | `~/backups/kickstaff/staging/2026-10-30_rental-landing-links-dev-to-staging/` · see `SHA256SUMS` (before dump was empty `[]`) |
| What changed | Upserted full `rental_landing_links` from local dev into staging product (staging had 0 rows) |
| Verified how | Post-apply select: 3 slugs; `dev-source.json` sha256 matches `staging-after.json` |
| Data lost or overwritten | **none** (staging table was empty) |
| Restore | `node copy-rental-landing-links.mjs` cannot restore empty; re-`DELETE FROM rental_landing_links` then leave empty, or reload `rental_landing_links.staging-before.json` (empty array) |
| Follow-ups | Confirm staging deploy serves rental media paths if any are site-relative; **none** blocking |
| Runbook | Ask/Agent session: Node Plan B copy (no host `pg_dump`) |

---
