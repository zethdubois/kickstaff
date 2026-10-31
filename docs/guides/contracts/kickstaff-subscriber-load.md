# Host brief: subscriber `load`, wiki, and progress

**Contract:** [`../../../../kickagent/docs/kickagent/architecture/frontend-guide.md`](../../../../kickagent/docs/kickagent/architecture/frontend-guide.md). Roles, datasets, command classes, and the one-instance / two-database URL shape live there. This file is the Kickstaff `load` / wiki / progress checklist only.

**Audience:** kickstaff. **Publisher:** kickagent (manifest **0.7.0**).

Kickagent is a host-agnostic publisher. It does not know Kick Asset Management, and it does not own a host's database. This host is the company's frontend. Company naming stays here. Do not push it back into kickagent.

Kickagent docs say the host command is `load kickagent`. **Console commands** (`load` / `unload`, palette via namespace, no `shell` / `kam:reload-kickagent` / `unalias`) are implemented. Remaining checklist items: multi-subscriber env registry, wiki/progress proxies, and Phase 1 static path cleanup.

## Human, before the next kickagent deploy

- [x] Rotate `KICKAGENT_SERVICE_TOKEN` (same value on kickstaff and kickagent). The old value has been in agent context.
- [ ] Rotate the production database password that was in kickagent `.env`. Kickagent should not keep a production URL; that password is a host secret.
- [ ] Confirm Railway kickagent services have no `KAM_*` variables. The new names are `KICKAGENT_WIKI_*`, `KICKAGENT_PROGRESS_*`, `KICKAGENT_DISCOVERY_*`, and `KICKAGENT_SERVICES`.
- [ ] Staging kickagent: `KICKAGENT_SERVICES=publish,wiki,progress`, `KICKAGENT_SERVICE_TOKEN` set, `KICKAGENT_PROGRESS_DATA` on a volume. Production kickagent: `KICKAGENT_SERVICES=publish` (or unset) and the token set. Production **refuses to start** when `NODE_ENV=production` and the token is missing.
- [ ] Do not attach a volume to the production publisher. A volume there costs zero-downtime deploys. Progress data belongs on staging.

## 1. Subscriber registry

Replace the single `PUBLIC_KICKAGENT_MANIFEST_URL` and the hard-coded kickagent special cases with a registry of subscribers. One entry today is enough. Key every cache and load record by subscriber id so a second publisher does not require another rewrite.

Config (server env, not a browser secret), for example:

```env
KICKSTAFF_SUBSCRIBERS=kickagent=http://127.0.0.1:7099/manifest.json
```

Each entry is `id=manifestUrl`. The id is only the host's config key. The command namespace comes from the manifest.

Delete or stop using:

- the single `PUBLIC_KICKAGENT_MANIFEST_URL` path in `src/lib/kickagent/loadPluginFromManifest.ts` (read the registry instead; keep the env as a fallback for the `kickagent` id until operators migrate)
- `KICKAGENT_NS` as a constant in `src/lib/devConsole/commands.ts` — the prefix is the loaded manifest `namespace` plus `:`
- `kamMode` (`default | kickagent`) in `src/lib/client/uiSettings.svelte.ts` — store the active subscriber namespace or empty. Bump `UI_SETTINGS_VERSION`.
- module-level `lastAppliedKey` — store `url + "@" + sha256` per subscriber id
- singleton manifest command and resource caches — key them by subscriber id

`loadPluginFromManifest.ts` already collects registrations, then clears and registers, so a failed fetch does not empty the palette. Keep that order, scoped to one subscriber.

## 2. Manifest fields (kickagent 0.7.0)

Additive. Ignore them and the host still loads.

| Field | Meaning |
| ----- | ------- |
| `namespace` | Command prefix. Default `kickagent`. Palette names are `<namespace>:<short>`. |
| `alias` | Suggested short name for entering that palette. Default `ka`. The host may already have that alias; if so, keep the host's and say so in the `load` log. |

A future `requires` list (not in 0.7.0) is how a publisher will ask the host for stores. Do not invent database hooks in this change. When it arrives, `load` checks `requires` and refuses with a clear line if the host cannot provide something.

## 3. Console commands

Bare words are host verbs. `<namespace>:<name>` belongs to a subscriber. Nothing else gets a prefix.

| Input | Behavior |
| ----- | -------- |
| `load` | Load every configured subscriber. |
| `load <id>` | Load one. First time loads; later times refresh. |
| `load --list` | One line per subscriber: id, version, sha prefix, command count, resource keys. |
| `load <id> --force` | Reload even when `url@sha256` matches. |
| `unload <id>` | Unregister that subscriber's commands and drop its caches. |
| `<namespace>` or `<alias>` | Enter that palette (bare names resolve only inside it). |
| `:help` (and any `:verb`) | Host command while a palette is active. |

Dedupe on **content hash**, not version. The manifest `sha256` is known before the module download finishes; the skip key is `manifestUrl + "@" + sha256`. A republish that changes bytes changes the hash even when the version string does not. `load` then prints either `already current (v0.7.0)` or swaps in the new module.

Status line, one generic line, no `units` or `gl` special case:

```text
kickagent v0.7.0 · 24 commands · resources: gl, sites, units
```

Count `manifest.commands`. List `Object.keys(manifest.resources)` excluding any non-resource bookkeeping the parser already strips. `resourcesCached` must not look for `resources.units.list`.

Collision policy:

- If `namespace` matches a host verb (`help`, `load`, `history`, …) or another loaded namespace, refuse that subscriber and say why.
- Inside a palette, the subscriber command wins for a bare name.
- `:name` always reaches the host registry.

Remove outright, with no alias left behind:

- `shell` (`shell kickagent`, `shell default`, `shell off`)
- `kam:reload-kickagent`

Login still calls the same load function `load` uses (force false).

Host log source strings that say `kam:` become `host:` or the subscriber namespace. The company abbreviation is fine in kickstaff product copy. It is not a command prefix.

## 4. Proxies for wiki and progress

**Implementation spec:** [kickstaff-wiki-progress-proxy.md](kickstaff-wiki-progress-proxy.md) (proxies only; not the registry work in §1).

Kickagent staging serves `/wiki/*` and `/progress/*` on the same origin as the manifest. Both require `Authorization: Bearer <KICKAGENT_SERVICE_TOKEN>` except when the request is loopback and the token is unset (local dev). The browser cannot send that header. This host proxies.

Add catch-all routes:

- `/wiki` and `/wiki/[...path]`
- `/progress` and `/progress/[...path]`

Rules:

- Any signed-in user. Any role. Not public.
- Forward method, query, and body to the kickagent origin (the manifest URL's origin) plus the same path.
- Set `Authorization: Bearer <KICKAGENT_SERVICE_TOKEN>`.
- Set `X-Kickagent-User-Id` and `X-Kickagent-User-Email` from the session. Progress uses the email as `source` when the entry omits one.
- Stream the response status and body back. Do not buffer downloads.
- Same-origin relative URLs in those apps must keep working (`wiki.js`, `docs/...`, `api/entries`). Do not rewrite them if the proxy preserves the path.

Same idea as `src/routes/api/kickagent/run/+server.ts`, but for GET, POST, PUT, and DELETE, and for HTML as well as JSON.

Direct requests to the kickagent host without the bearer token get **401**. That is intentional.

## 5. Stop special-casing the publisher

After `load` is generic:

- Delete the Phase 1 static path once nothing calls it: `BROWSER_PLUGIN_CATALOG`, `registerHelloCommand`, `registerKickagentCatalogCommands`. Confirm with a search first.
- Units and GL pages go through the list/detail builder. Drop `getUnitsListSchema` / `getGlListSchema` checks in the reload message. The thin units v1 path stays only until kickagent lifts `resources.units`; do not add a new name-specific parser.
- ~~`src/lib/kickagent/outcomeToTableModel.ts` tells the user to run `kam:reload-kickagent`. Say `load kickagent`.~~ Done.

## 6. Files that moved here

Company material left kickagent. It now lives in this repo:

| Was in kickagent | Now |
| --- | --- |
| `docs/kam-suite/` | `docs/kam-suite/` |
| `docs/dump/` | `docs/dump/` |
| `docs/KAM_Agent_Proposal_Sequence.docx.md` | `docs/dump/KAM_Agent_Proposal_Sequence.repo-root.docx.md` |
| `docs/DEV/strategy for project costs.md` | `docs/projects/strategy for project costs.md` |
| `docs/discovery/survey-seed.json` and `docs/discovery/sessions/` | `docs/discovery/` |
| `docs/chart_of_accounts-20260826.csv` and `.xlsx` | `docs/upgrade/` |
| `docs/AF--…unit_directory….csv` | `docs/upgrade/` |

Kickagent's discovery collector (dev only, port 7096) reads the seed and sessions from `../kickstaff/docs/discovery/` unless `KICKAGENT_DISCOVERY_DATA` points elsewhere.

Fix stale links in [README.md](README.md): the kickagent paths are `docs/kickagent/architecture/kickstaff-integration.md`, `docs/kickagent/architecture/plugin-manifest-and-reload.md`, and `docs/kickagent/architecture/platform-spec.md`.

## 7. Acceptance

- [x] `load` with no args loads the configured subscriber and prints the generic status line.
- [x] `load kickagent` a second time, with no publish in between, prints already current and does not download the module again.
- [x] After a kickagent republish (new sha, same version string), `load kickagent` swaps the module.
- [x] `load --list` shows id, version, command count, and resource keys.
- [x] `ka` (or the manifest alias) enters the palette; `:help` still runs the host command.
- [x] `shell` and `kam:reload-kickagent` are unknown.
- [x] A namespace that collides with `help` or `load` is refused.
- [x] Signed-out `GET /wiki` redirects to login (proxy auth gate). Signed-in non-admin wiki HTML + progress `source` from email: verify on staging after deploy (kickagent must mount wiki/progress).
- [x] `GET https://kickagent-staging.up.railway.app/wiki/` without a bearer token is 401 (verified 2026-10-30).
- [x] Proxy unit tests: auth gate, Bearer + user headers, same-path upstream, missing base → 502. (Registry parse / sha skip / collision: earlier load work.)

## Out of scope

- Host-provided database stores. Wait for manifest `requires`.
- A second subscriber implementation. The registry must be keyed by id; do not add a second product in this change.
- Renaming the KAM console product name in kickstaff. Company naming stays in this repo.
