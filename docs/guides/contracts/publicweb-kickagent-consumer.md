# publicweb — kickagent consumer guide

**Audience:** Developers working in **publicweb** only.

**Purpose:** What publicweb must provide as the KAM **host/subscriber**, how integration works today, and what we plan to add for dynamic plugin load and API-backed jobs. Implementation details for kickagent CI, S3, and the KA API live in the kickagent repo — [platform spec](../../../kickagent/docs/kickagent-platform-spec.md) (sibling checkout `../kickagent`).

---

## Roles

| Repo | Role |
|------|------|
| **publicweb** | UI, admin auth, KAM console, host commands, load plugin, proxy API (later) |
| **kickagent** | Command implementations, published ESM + manifest, runtime API (later) |

publicweb does **not** design kickagent’s LLM pipelines or batch workers here; it documents **expectations** at the boundary.

---

## Integration phases

### Phase 1 — Static package (current)

- Dependency: `"kickagent": "file:../kickagent"` in [package.json](../../../package.json).
- Each command is wired in TypeScript, e.g. [registerHelloCommand.ts](../../../src/lib/kickagent/registerHelloCommand.ts).
- Uses `registerKickagentCommand("hello", handler)` → full name `kickagent:hello`.
- Handlers call imported functions from the `kickagent` package directly.
- **Deploy:** bump kickagent + rebuild/redeploy publicweb to pick up new commands.

### Phase 2 — Dynamic plugin load (planned)

- kickagent CI publishes `manifest.json` + ESM to a pinned CDN/S3 origin.
- publicweb host command **`kam:reload-kickagent`** (or auto-poll manifest hash):
  - Fetch manifest over HTTPS.
  - Verify `sha256` (and pinned origin).
  - `import(manifest.moduleUrl)`.
  - Call plugin `register(registry, ctx)`.
  - **Unregister** previous kickagent-scoped handlers on success.
- **Deploy:** new kickagent commands without full publicweb rebuild (client/plugin artifact only).

### Phase 3 — Remote jobs (planned)

- Some plugin handlers call the **kickagent API** (long compute, LLMs, ETL).
- publicweb exposes **`/api/kickagent/*`** (admin-only) to proxy jobs and SSE logs into klog.
- Secrets stay off the client; prefer running plugin handlers server-side.

See the kickagent repo [platform spec](../../../kickagent/docs/kickagent-platform-spec.md) for draft manifest/API shapes.

---

## What publicweb owns (always)

These are **host** concerns — not registered by the kickagent plugin:

| Concern | Location / command |
|---------|-------------------|
| Command palette + KAM pane | [Palette.svelte](../../../src/lib/devConsole/Palette.svelte), [KamConsole.svelte](../../../src/lib/devConsole/KamConsole.svelte) |
| Command registry | [commands.ts](../../../src/lib/devConsole/commands.ts) |
| Kickagent mode (`[KA] >`, prefix resolution) | [commands.ts](../../../src/lib/devConsole/commands.ts), [kam-console.md](../kam-console.md) |
| Meta: `shell`, `exit` (`:shell default`, `:exit` from inside KA shell) | Built-in host commands |
| Meta: `alias` / `unalias` (`ka` ↔ `shell kickagent` via `alias kickagent ka`) | Persisted in [`consoleUi.svelte.ts`](../../../src/lib/client/consoleUi.svelte.ts); see [kam-console.md](../kam-console.md) |
| Meta: `help`, `console`, `clear`, `echo`, `reset` | Built-in host commands |
| Admin-only registration | [+layout.svelte](../../../src/routes/+layout.svelte) `onMount` when `isAdmin` |
| klog persistence | `/api/klogs`, [state.svelte.ts](../../../src/lib/devConsole/state.svelte.ts) |
| `kamMode` persistence | [uiSettings.svelte.ts](../../../src/lib/client/uiSettings.svelte.ts) |

- Unqualified names in KA shell resolve **only** to `kickagent:<name>`. Use `:command` for publicweb (e.g. `:help`, `:exit`, `:shell default`, `:clear`).
- Full name `kickagent:hello` works in any mode. `:kickagent:hello` runs the same (leading `:` strips to host-qualified resolution).
- Enter KA shell: **`shell kickagent`**, or a user alias such as **`ka`** after **`alias kickagent ka`**. Leave: **`shell default`** / **`shell off`** (from default shell) or **`:exit`** / **`:shell default`** from inside KA shell.
- Visual: `[KA] >` prompt + green accent bar — see [kam-console.md](../kam-console.md).

### Registering a command today (Phase 1)

```ts
import { registerKickagentCommand } from "$lib/kickagent/commands";
import { helloWorld } from "kickagent";

registerKickagentCommand("hello", async () => {
  const logger = createDemoLogger("kickagent:hello");
  const result = await helloWorld(user.id, user.email, logger);
  return { log: result.message, level: "info" };
});
```

Helper re-export: [src/lib/kickagent/commands.ts](../../../src/lib/kickagent/commands.ts).

---

## What publicweb expects from kickagent

### Today (Phase 1)

- ESM package with exported functions and local `KlogBroadcaster` type — [kickagent-essentials-spec.md](kickagent-essentials-spec.md).
- No import of publicweb or SvelteKit in kickagent.
- CLI for standalone testing.

### Soon (Phase 2)

- Versioned **`manifest.json`** + **`kickagent-{version}.esm.js`** at a trusted URL.
- Default export or named export: `register(registry, ctx)`.
- Command metadata in manifest for richer `help` (optional).

### Later (Phase 3)

- HTTP API for jobs + streamed logs.
- Plugin handlers that call the API using host-provided `apiBaseUrl` and auth (via publicweb proxy).

---

## Planned publicweb work (not all implemented)

| Item | Purpose |
|------|---------|
| `unregisterCommand` / `clearKickagentCommands()` | Safe reload without duplicate handlers |
| `kam:reload-kickagent` | Admin meta-command to load manifest + plugin |
| Env: `PUBLIC_KICKAGENT_MANIFEST_URL` | Per-environment manifest pointer |
| Optional auto-poll | Compare manifest hash on interval; klog when updated |
| `/api/kickagent/jobs` + SSE | Phase 3 proxy to KA API |
| Single loader module | Replace per-command files with one `loadKickagentPlugin()` |

Track implementation against Phase 2/3 in this repo; do not duplicate KA CI/S3 docs here once relocated.

---

## Security (consumer rules)

- Only **admins** register or reload kickagent commands (same as today’s layout guard).
- Only load plugins from **configured origin** (env allowlist); never user-supplied URLs.
- Verify manifest **hash** before `import()`.
- On failed reload, **keep previous** plugin version active.
- Do not ship KA API keys in client bundles; use server proxy for Phase 3.

---

## Operator / developer flows

### Local dev (Phase 1)

1. Clone `../kickagent`, `pnpm build` in kickagent.
2. `pnpm install` in publicweb.
3. Sign in as admin, **`shell kickagent`** (or define **`alias kickagent ka`** once, then **`ka`**), run **`hello`** or **`kickagent:hello`**.

### After Phase 2

1. kickagent CI publishes manifest to dev/staging/prod URL.
2. Set `PUBLIC_KICKAGENT_MANIFEST_URL` in publicweb `.env`.
3. In KAM: `kam:reload-kickagent` (or reload on login if auto-poll enabled).

---

## Related docs

| Doc | Use |
|-----|-----|
| [README.md](README.md) | Contracts index |
| [publicweb-hello-world.md](publicweb-hello-world.md) | Phase 1 hello wiring |
| [kickagent-essentials-spec.md](kickagent-essentials-spec.md) | Phase 1 kickagent package contract |
| [kickagent/docs/kickagent-platform-spec.md](../../../kickagent/docs/kickagent-platform-spec.md) | Platform spec (kickagent repo, source of truth) |
| [../kam-console.md](../kam-console.md) | KAM UX, kickagent mode |

---

## Doc maintenance

- **publicweb** updates this file when host behavior or env vars change.
- **kickagent** owns platform/CI/API details in kickagent repo after stub relocation.
- Keep Phase labels accurate when features ship (update “planned” → “current”).
