# Kickdesk subscriber (publicweb)

publicweb registers with **[Kickdesk](https://github.com/Kick-Asset-Management/kickdesk)** for local dev cockpit status (ports, workflows, migrate column). Kickdesk loads operational config from **`~/.config/publicweb/`** — not from files inside this repo.

## Start here

1. Read [`kickdesk.registration.json`](../../kickdesk.registration.json) — app id, config dir, publish commands, paths to Kickdesk spec files.
2. For **schema and discovery rules**, read the Kickdesk repo (readonly):
   - `${KICKDESK_ROOT:-../kickdesk}/docs/MANIFEST.md`
   - `${KICKDESK_ROOT:-../kickdesk}/examples/manifest.sample.json`
3. **Values** (ports, `pnpm` commands, workflows) live in [`scripts/kickdesk-manifest.ts`](../../scripts/kickdesk-manifest.ts). Do not copy `manifest.sample.json` verbatim (`id: "my-app"` is a template only).

## Publish

| Command | Writes |
|---------|--------|
| `pnpm kickdesk:publish-manifest` | `~/.config/publicweb/manifest.json` |
| `pnpm db:migrate:status` | `~/.config/publicweb/migrate-status` (one line: `ok`, `pending:N`, `unavailable`) |

**When to run (ongoing dev):** see the habit table in [README.md → Kickdesk](../../README.md#kickdesk-local-cockpit) and [AGENTS.md](../../AGENTS.md#kickdesk). Use this guide for first-time subscriber setup; you rarely need to reopen it after that.

## Manifest summary (50xx family)

| Field | Value |
|-------|--------|
| `id` | `publicweb` |
| `port_family` | `50` |
| `primary_port` / app | `5000` |
| db | `5043` |
| `url` | `http://localhost:5000` |
| `workflows.start` | `db-up` → `migrate` → `up` |
| `workflows.stop` | `stop-server` → `db-down` |

See [`scripts/kickdesk-manifest.ts`](../../scripts/kickdesk-manifest.ts) for the full `commands` map.

## Kickdesk operator config

Your `~/.config/kickdesk/config.json` registry should list this repo by **path** (and optional label). Per-app ports/commands belong in the published manifest, not inline in the registry — see Kickdesk [`examples/config.json`](../../kickdesk/examples/config.json) (thin registry). Legacy monolithic `apps.<id>` blocks still work until you slim the file.

Validate after publish:

```bash
kickdesk config validate --app publicweb
```

## Agents

Cursor rule: [`.cursor/rules/kickdesk.mdc`](../../.cursor/rules/kickdesk.mdc). Summary: read registration + KD spec when touching ports, compose, migrate integration, or manifest publish; run publish / migrate-status per triggers above.
