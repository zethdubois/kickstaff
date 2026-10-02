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
3. [../platform-overview.md](../platform-overview.md) — **data, storage, and product boundaries** (one DB, two schemas).
4. [kickstaff-hello-world.md](kickstaff-hello-world.md) — Phase 1 hello wiring in this codebase.
5. [../kam-console.md](../kam-console.md) — KAM console, kickagent mode, `[KA] >`.

## Kickagent platform (kickagent repo)

Manifest, ESM plugin, API jobs, and CI live in the **kickagent** repo (sibling checkout at `../kickagent`):

- [kickagent/docs/kickstaff-integration.md](../../../kickagent/docs/kickstaff-integration.md) — **entry point for kickstaff** engineers (links to manifest reload + platform spec).
- [kickagent/docs/guides/plugin-manifest-and-reload.md](../../../kickagent/docs/guides/plugin-manifest-and-reload.md) — concrete host load steps.
- [kickagent/docs/kickagent-platform-spec.md](../../../kickagent/docs/kickagent-platform-spec.md)

## Phase 1 package contract

| Doc | Role |
|-----|------|
| [kickagent-essentials-spec.md](kickagent-essentials-spec.md) | Library-first npm contract (`helloWorld`, logger, CLI) |
| [kickagent-hello-world.md](kickagent-hello-world.md) | First-milestone scaffolding in kickagent repo |

## Architecture (evolving)

```text
Phase 1   npm import + manual registerKickagentCommand when no manifest URL; shell kickagent (optional alias) to enter [KA]
Phase 2   PUBLIC_KICKAGENT_MANIFEST_URL + browser load + kam:reload-kickagent; bump artifact on kickagent side + reload
Phase 3 (planned)   kickagent API for jobs; kickstaff proxies SSE → klog
```

- **Host (kickstaff):** KAM shell; enter with **`shell kickagent`** (or shortcut after **`alias kickagent ka`**); `:` escape for host commands inside [KA]; `kickagent:` prefix for subscriber commands only.
- **Publisher (kickagent):** functions today; versioned plugin + API tomorrow.

Details: [kickstaff-kickagent-consumer.md](kickstaff-kickagent-consumer.md) and kickagent [platform spec](../../../kickagent/docs/kickagent-platform-spec.md).
