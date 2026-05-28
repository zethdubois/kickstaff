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

## Data and storage

Canonical architecture: [platform-overview.md](../platform-overview.md).

- **Postgres:** publicweb owns only core product tables in [`src/lib/server/schema.ts`](../../../src/lib/server/schema.ts) (`users`, `sessions`, `rental_landing_links`, `dashboard_links`, `user_dashboard_link_preferences`, `klogs`). Legacy ops tables were **dropped** from the publicweb database; kickagent will recreate under **`operations`** schema.
- **publicweb does not** run bill/units ETL or expose `/api/admin/bills/*`; Phase 3 will proxy kickagent jobs only.
- **S3** and future **Redis** are kickagent deploy concerns — see [docs/upgrade/README.md](../../upgrade/README.md).

---

## Integration phases

### Phase 1 — Static package (default when manifest URL unset)

- **No npm dependency** on kickagent in publicweb (Railway/build-safe). Local hello/foo fallback: [`browserPluginCatalog.ts`](../../../src/lib/kickagent/browserPluginCatalog.ts). Optional sibling repo only to run `serve-publish` and publish artifacts.

- Each command is wired in TypeScript, e.g. [registerHelloCommand.ts](../../../src/lib/kickagent/registerHelloCommand.ts).
- Uses `registerKickagentCommand("hello", handler)` → full name `kickagent:hello`.
- Handlers call imported functions from the `kickagent` package directly.
- **Deploy:** bump kickagent + rebuild/redeploy publicweb to pick up new commands.

When **`PUBLIC_KICKAGENT_MANIFEST_URL`** is set, layout bootstraps **Phase 2** instead (see below) and does **not** register the static hello handler on first load.

### Phase 2 — Dynamic plugin load (implemented for client-side demo)

**Kickagent entry doc:** [publicweb-integration.md](../../../kickagent/docs/publicweb-integration.md) · **Host steps:** [plugin-manifest-and-reload.md](../../../kickagent/docs/guides/plugin-manifest-and-reload.md).

- Set **`PUBLIC_KICKAGENT_MANIFEST_URL`** (e.g. `http://127.0.0.1:7099/manifest.json` when kickagent runs `serve-publish` on 7099). Documented in [`.env.example`](../../../.env.example).
- On **admin** login, publicweb runs [`loadPluginFromManifest.ts`](../../../src/lib/kickagent/loadPluginFromManifest.ts): fetch manifest → fetch module bytes → verify **`sha256`** → dynamic `import()` via blob URL → **`register(registry, ctx)`** from the bundle → wraps handlers with current session (`pluginSession`).
- Host command **`kam:reload-kickagent`** — `clearKickagentCommands()`, then the same load flow (**forced**, reapplies same version).
- **Deploy:** new kickagent artifacts without bumping publicweb’s `kickagent` npm dependency (reload picks up new manifest/module URLs).

Production hardening (server-side execution, auto-poll) remains optional follow-up.

**Production CORS:** On the kickagent `serve-publish` service set `KICKAGENT_CORS_ORIGINS` to your publicweb origins (comma-separated), e.g. `https://www.kickassetmanagement.com,https://kickassetmanagement.com`. Use **`https://`** for `PUBLIC_KICKAGENT_MANIFEST_URL` (not `http://` — the browser blocks non-local http).

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
| Meta: `help`, `console`, `clear`, `echo`, `reset` | Built-in host commands |
| Meta: `alias` / `unalias` (`ka` ↔ `shell kickagent` via `alias kickagent ka`) | Persisted in [`consoleUi.svelte.ts`](../../../src/lib/client/consoleUi.svelte.ts); see [kam-console.md](../kam-console.md) |
| Meta: `kam:reload-kickagent` | Phase 2 reload ([commands.ts](../../../src/lib/devConsole/commands.ts)); requires manifest URL |
| Phase 2 manifest bootstrap | [loadPluginFromManifest.ts](../../../src/lib/kickagent/loadPluginFromManifest.ts), [pluginSession.ts](../../../src/lib/kickagent/pluginSession.ts); [+layout.svelte](../../../src/routes/+layout.svelte) (`$effect` when admin + `PUBLIC_KICKAGENT_MANIFEST_URL`) |
| Admin-only registration | [+layout.svelte](../../../src/routes/+layout.svelte): hydrate + kickagent bootstrap when `isAdmin` |
| klog persistence | `/api/klogs`, [state.svelte.ts](../../../src/lib/devConsole/state.svelte.ts) |
| `kamMode` persistence | [uiSettings.svelte.ts](../../../src/lib/client/uiSettings.svelte.ts) |

- Unqualified names in KA shell resolve **only** to `kickagent:<name>`. Use `:command` for publicweb (e.g. `:help`, `:exit`, `:shell default`, `:clear`).
- Full name `kickagent:hello` works in any mode. `:kickagent:hello` runs the same (leading `:` strips to host-qualified resolution).
- Enter KA shell: **`shell kickagent`**, or a user alias such as **`ka`** after **`alias kickagent ka`**. Leave: **`shell default`** / **`shell off`** (from default shell) or **`:exit`** / **`:shell default`** from inside KA shell.
- Visual: `[KA] >` prompt + green accent bar — see [kam-console.md](../kam-console.md).

### Registering commands (Phase 1)

When **`PUBLIC_KICKAGENT_MANIFEST_URL`** is unset, admin login runs [`registerKickagentCatalogCommands`](../../../src/lib/kickagent/registerCatalogCommands.ts) from [`+layout.svelte`](../../../src/routes/+layout.svelte). That uses [`browserPluginCatalog.ts`](../../../src/lib/kickagent/browserPluginCatalog.ts) (hello/foo only). Hub metadata: [`kickagentManifestCatalog.ts`](../../../src/lib/server/kickagentManifestCatalog.ts) (manifest fetch or same static defaults).

**Checklist (humans + agents):** [register-kickagent-command.md](../register-kickagent-command.md).

Low-level helper: [src/lib/kickagent/commands.ts](../../../src/lib/kickagent/commands.ts) re-exports `registerKickagentCommand` for exceptional host-only commands outside the catalog.

### Ops hub command cards (KAM-UI v0)

The authenticated home page (`/`) is a category-column **linkboard** backed by `dashboard_links`. Kickagent commands can appear as **command cards** in the same UI after **lazy materialization**:

1. Each kickagent row in **`COMMAND_CATALOG`** must include **`category`** (and optional **`sortOrder`**) so cards sort with URL links.
2. On first successful run of a `kickagent:*` command (palette, console, or hub **Run**), the host calls **`POST /api/dashboard/materialize-command`** with `commandKey` (e.g. `kickagent:hello`).
3. Server inserts a `dashboard_links` row (`item_type = command`, `command_key`, no `hyperlink`) using catalog/manifest metadata unless a row already exists (user edits in Settings are preserved).
4. Users hide/reorder/relabel cards under **Settings → Dashboard** like ordinary links.

Implementation: [dashboardCommandMaterialize.ts](../../../src/lib/server/dashboardCommandMaterialize.ts), [materialize-command API](../../../src/routes/api/dashboard/materialize-command/+server.ts), hub [`+page.svelte`](../../../src/routes/+page.svelte). Phase 2 manifest `commands[]` includes `category`; cached client-side in [manifestCommandCache.ts](../../../src/lib/kickagent/manifestCommandCache.ts) after plugin load.

---

## What publicweb expects from kickagent

### Today (Phase 1)

- ESM package with exported functions, **`COMMAND_CATALOG`** (includes required **`category`** per command), and local `KlogBroadcaster` type — [kickagent-essentials-spec.md](kickagent-essentials-spec.md).
- No import of publicweb or SvelteKit in kickagent.
- CLI for standalone testing.

### Manifest plugin (Phase 2 — host load)

- **`manifest.json`** + ESM bundle at configured URL; **`register(registry, ctx)`** in the bundle.
- publicweb verifies **`sha256`** and loads in the browser (demo); production may move execution server-side later.

### Later (Phase 3)

- HTTP API for jobs + streamed logs.
- Plugin handlers that call the API using host-provided `apiBaseUrl` and auth (via publicweb proxy).

---

## Planned publicweb work (remaining)

| Item | Purpose |
|------|---------|
| Optional auto-poll manifest hash | klog when updated |
| `/api/kickagent/jobs` + SSE | Phase 3 proxy to KA API |
| Server-side plugin execution | Align with kickagent security guidance for production |

<details>
<summary>Implemented (was “planned”)</summary>

- `clearKickagentCommands()` — [commands.ts](../../../src/lib/devConsole/commands.ts)
- `kam:reload-kickagent` — same file
- Env: `PUBLIC_KICKAGENT_MANIFEST_URL` — [.env.example](../../../.env.example)
- Loader module — [loadPluginFromManifest.ts](../../../src/lib/kickagent/loadPluginFromManifest.ts)

</details>

Track Phase 3 and production hardening in this repo; publisher-side truth stays in kickagent.

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

### After Phase 2 (local)

1. In kickagent: `pnpm build`, `publish` + `serve-publish` (see kickagent [plugin-manifest-and-reload.md](../../../kickagent/docs/guides/plugin-manifest-and-reload.md)).
2. In publicweb `.env`: `PUBLIC_KICKAGENT_MANIFEST_URL=http://127.0.0.1:7099/manifest.json` (restart dev server).
3. Sign in as admin — plugin loads from manifest; use **`kam:reload-kickagent`** after republishing.

### After Phase 2 (production)

1. kickagent CI publishes manifest + bundle to your CDN/origin.
2. Set `PUBLIC_KICKAGENT_MANIFEST_URL` in publicweb `.env`.
3. In KAM: **`kam:reload-kickagent`** when you want to pin a new artifact (or after login if you add auto-poll later).

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
