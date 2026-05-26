---
name: repo-architecture-onboarding
description: >-
  Onboard to an unfamiliar repository by following a fixed doc-and-code ladder,
  then produce a structured architecture summary. Use when the user asks how the
  repo works, wants an architecture overview, is new to the codebase, says
  "onboard", "learn this repo", or before large cross-cutting changes.
---

# Repo Architecture Onboarding

Thin **procedure** skill: follow the ladder below, read repo docs (do not duplicate them in chat), validate with a small code slice, then deliver the report template.

## When to run

- User asks what the project is, how it is structured, or where to start.
- Task spans multiple areas and you lack context.
- User names this skill or asks for repo onboarding.

Skip deep onboarding for a **single-file, obvious fix** in an area you already understand.

## Ladder (strict order)

Work top to bottom. Stop at each step when the path is missing; note gaps in the report.

### Step 1 — Agent / Cursor entry points

Search the repo root and `.cursor/`:

| Path | Role |
|------|------|
| `AGENTS.md` | Coordinator: stack, scripts, env, doc order |
| `CLAUDE.md` | Same role (some repos) |
| `.cursor/rules/*.mdc` | Scoped rules (read only rules whose globs match your task) |
| `.cursor/skills/` | Other workflows for this repo |

If `AGENTS.md` exists, treat it as the **doc router** for everything below.

### Step 2 — Human front door

| Path | Role |
|------|------|
| `README.md` | Purpose, layout sketch, dev setup |
| `CONTRIBUTING.md` | Contributor norms |
| `docs/**/README.md` | Doc indexes (e.g. `docs/guides/README.md`) |
| `ARCHITECTURE.md`, `docs/architecture*.md`, `docs/**/platform-overview.md` | System design |

### Step 3 — Executable structure (quick scan)

Read only what you need to confirm stack and run path:

- Root manifest: `package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, etc.
- **Scripts** section: `dev`, `build`, `test`, `migrate`, `check`
- `.env.example` — integrations and required env (never commit secrets)
- Top-level dirs: `src/`, `apps/`, `packages/`, `infra/`
- Framework config: `svelte.config.js`, `vite.config.ts`, `docker-compose.yml`
- Data layer: `migrations/`, `drizzle/`, `prisma/`, `schema/`

### Step 4 — Boundaries and contracts

If the README or agent doc mentions siblings, platforms, or subscribers:

- `docs/contracts/`, `docs/guides/contracts/`
- Registration files (e.g. `kickdesk.registration.json`)
- Sibling repos (`../other-repo`) — read **indexes** in this repo first; only open siblings when the task requires it

### Step 5 — Task-scoped docs (if changing a route/area)

When `AGENTS.md` or the doc index defines a **route pipeline**, read in order:

1. Global coordinator (`AGENTS.md`)
2. `docs/guides/<route-scope>-architecture.md` (or repo’s equivalent)
3. `docs/guides/<route-scope>-ui-map.md` (or equivalent)

Derive `<route-scope>` from URL segments (kebab-case). If a paired doc is missing, say so in the report.

### Step 6 — Code validation (one vertical slice)

Confirm docs against code — **one** representative path, not a full tree walk:

- Auth / request gate (e.g. `hooks.server.ts`, middleware)
- One route or module end-to-end (handler → lib → DB/API)
- Schema or types for persisted data

Use grep/glob to locate symbols; do not read every file.

## This repository (publicweb)

When cwd is **publicweb**, prefer these after Step 1:

| Order | Doc |
|-------|-----|
| 1 | [AGENTS.md](../../AGENTS.md) |
| 2 | [docs/guides/README.md](../../docs/guides/README.md) |
| 3 | [docs/guides/platform-overview.md](../../docs/guides/platform-overview.md) |
| 4 | [README.md](../../README.md) (Development section) |
| 5 | [.env.example](../../.env.example) |
| Route work | `docs/guides/<scope>-architecture.md` → `docs/guides/<scope>-ui-map.md` |
| Cross-repo KAM/kickagent | [docs/guides/contracts/README.md](../../docs/guides/contracts/README.md) |
| Kickdesk edits | [.cursor/rules/kickdesk.mdc](../../rules/kickdesk.mdc) |

**Platform split:** publicweb (product shell, marketing, KAM host) vs **kickagent** sibling (`operations` schema). **Stack:** SvelteKit, pnpm, PostgreSQL/Drizzle, cookie sessions.

## Output

Deliver this report unless the user asked for a narrower answer:

```markdown
## Repo onboarding summary

### What it is
[1–3 sentences: product purpose and primary users]

### Stack and run
- **Runtime / framework:**
- **Package manager / key scripts:**
- **Data / infra:**
- **Local dev:** [commands from README; note ports if documented]

### Repository layout
[High-level dirs and what lives where — bullet list]

### Boundaries
[Sibling repos, schemas, external services, auth model — or "monolith, no siblings"]

### Documentation map
| Topic | Path | Notes |
|-------|------|-------|
| Agent coordinator | … | present / missing |
| Architecture overview | … | |
| Doc index | … | |
| Route-scoped (if any) | … | |

### Conventions worth remembering
[Naming, env rules, test/check commands — from AGENTS.md or SOP]

### Vertical slice checked
[Which auth hook / route / schema you traced]

### Gaps and risks
[Missing docs, doc/code drift, unclear ownership — bullet list]
```

Keep the summary **short**; link paths instead of pasting large excerpts.

## Anti-patterns

- Do **not** invent architecture not supported by docs or the code slice.
- Do **not** read the entire `src/` tree before Steps 1–5.
- Do **not** duplicate long content from `AGENTS.md` — link and distill.
- Do **not** open sibling repos unless the task or contracts index requires it.
