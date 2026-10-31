# Cross-repo contracts (kickstaff ↔ kickagent)

Integration docs for the sibling **kickagent** package (`../kickagent`, `link:../kickagent` in `package.json`). Files in this folder describe the **boundary** between repos.

## Naming rule

Filename prefix = **audience** (who should read it), not which repo wrote the file.

| Prefix | Audience | Question it answers |
|--------|----------|---------------------|
| `kickagent-*` | Developer in the **kickagent** repo | What must kickagent publish/implement? |
| `kickstaff-*` | Developer in **kickstaff** | How does the host wire and consume kickagent? |

## Start here (kickstaff developers)

1. [../host-mission.md](../host-mission.md) — **why this host stays generic** (builders by UI class; kickagent publisher ask).
2. [kickstaff-kickagent-consumer.md](kickstaff-kickagent-consumer.md) — **host/subscriber** guide (phases, security, what kickstaff owns).
3. [../platform-overview.md](../platform-overview.md) — **data, storage, and product boundaries** (one Postgres instance, two databases). Host contract: Kickagent `docs/kickagent/architecture/frontend-guide.md`.
4. [kickstaff-hello-world.md](kickstaff-hello-world.md) — Phase 1 hello wiring in this codebase.
5. [../kam-console.md](../kam-console.md) — KAM console, kickagent mode, `[KA] >`.
6. [kickstaff-subscriber-load.md](kickstaff-subscriber-load.md) — `load`, registry, wiki and progress proxies.
7. [kickstaff-wiki-progress-proxy.md](kickstaff-wiki-progress-proxy.md) — **implement now:** signed-in `/wiki` and `/progress` proxies.
8. [Host ops database](../../../kickagent/docs/kickagent/architecture/host-ops-database.md) — dataset form. The host holds every database URL, including dev.

## Kickagent platform (kickagent repo)

Manifest, ESM plugin, API jobs, and CI live in the **kickagent** repo (sibling checkout at `../kickagent`):

- [kickagent architecture / kickstaff integration](../../../kickagent/docs/kickagent/architecture/kickstaff-integration.md) — entry point for host engineers.
- [plugin load](../../../kickagent/docs/kickagent/architecture/plugin-manifest-and-reload.md) — manifest, `namespace`, `load`.
- [platform spec](../../../kickagent/docs/kickagent/architecture/platform-spec.md)

## Phase 1 package contract

| Doc | Role |
|-----|------|
| [kickagent-essentials-spec.md](kickagent-essentials-spec.md) | Library-first npm contract (`helloWorld`, logger, CLI) |
| [kickagent-hello-world.md](kickagent-hello-world.md) | First-milestone scaffolding in kickagent repo |

## Architecture (evolving)

```text
Phase 1   npm import + manual registerKickagentCommand when no manifest URL; enter palette with kickagent (optional alias)
Phase 2   PUBLIC_KICKAGENT_MANIFEST_URL + browser load + `load kickagent`; bump artifact on kickagent side + load
Phase 3 (planned)   kickagent API for jobs; kickstaff proxies SSE → klog
```

- **Host (kickstaff):** KAM console; enter palette with **`kickagent`** (or shortcut after **`alias kickagent ka`**); `:` escape for host commands inside [KA]; `kickagent:` prefix for subscriber commands only. Reload with **`load kickagent`**.
- **Publisher (kickagent):** functions today; versioned plugin + API tomorrow.

Details: [kickstaff-kickagent-consumer.md](kickstaff-kickagent-consumer.md), [kickstaff-subscriber-load.md](kickstaff-subscriber-load.md), and kickagent [platform spec](../../../kickagent/docs/kickagent/architecture/platform-spec.md).
