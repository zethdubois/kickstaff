# Cross-repo contracts (publicweb ↔ kickagent)

Integration docs for the sibling **kickagent** package (`../kickagent`, `link:../kickagent` in `package.json`). Files in this folder describe the **boundary** between repos.

## Naming rule

Filename prefix = **audience** (who should read it), not which repo wrote the file.

| Prefix | Audience | Question it answers |
|--------|----------|---------------------|
| `kickagent-*` | Developer in the **kickagent** repo | What must kickagent publish/implement? |
| `publicweb-*` | Developer in **publicweb** | How does the host wire and consume kickagent? |

## Start here (publicweb developers)

1. [publicweb-kickagent-consumer.md](publicweb-kickagent-consumer.md) — **host/subscriber** guide (phases, security, what PW owns).
2. [../platform-overview.md](../platform-overview.md) — **data, storage, and product boundaries** (one DB, two schemas).
3. [publicweb-hello-world.md](publicweb-hello-world.md) — Phase 1 hello wiring in this codebase.
4. [../kam-console.md](../kam-console.md) — KAM console, kickagent mode, `[KA] >`.

## Kickagent platform (kickagent repo)

Manifest, ESM plugin, API jobs, and CI live in the **kickagent** repo (sibling checkout at `../kickagent`):

- [kickagent/docs/publicweb-integration.md](../../../kickagent/docs/publicweb-integration.md) — **entry point for publicweb** engineers (links to manifest reload + platform spec).
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
Phase 3 (planned)   kickagent API for jobs; PW proxies SSE → klog
```

- **Host (publicweb):** KAM shell; enter with **`shell kickagent`** (or shortcut after **`alias kickagent ka`**); `:` escape for host commands inside [KA]; `kickagent:` prefix for subscriber commands only.
- **Publisher (kickagent):** functions today; versioned plugin + API tomorrow.

Details: [publicweb-kickagent-consumer.md](publicweb-kickagent-consumer.md) and kickagent [platform spec](../../../kickagent/docs/kickagent-platform-spec.md).
