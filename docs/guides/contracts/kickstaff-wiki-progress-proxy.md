# Spec: wiki and progress proxies (kickstaff)

**Audience:** kickstaff agent / host engineer.  
**Publisher:** kickagent (staging already mounts these routes).  
**Parent brief:** [kickstaff-subscriber-load.md](kickstaff-subscriber-load.md) §4 and §7 (wiki/progress bullets only).

This pass is **proxies only**. Do **not** implement `KICKSTAFF_SUBSCRIBERS`, `kamMode` removal, or Phase 1 static catalog cleanup here.

## Goal

Office users open wiki and progress on the **kickstaff** origin while signed in. Kickstaff forwards to kickagent with the service token. The browser never sees `KICKAGENT_SERVICE_TOKEN`.

```text
Browser  --session cookie-->  Kickstaff /wiki|/progress
Kickstaff --Bearer + X-Kickagent-User-*-->  Kickagent same path
```

## Upstream (kickagent) — already done

| Fact | Detail |
| --- | --- |
| Same origin as manifest | Staging: `KICKAGENT_SERVICES=publish,wiki,progress` |
| Paths | `/wiki`, `/wiki/*`, `/progress`, `/progress/*` |
| Auth | `Authorization: Bearer <KICKAGENT_SERVICE_TOKEN>` required off-loopback; missing → **401** |
| Progress storage | `KICKAGENT_PROGRESS_DATA` (e.g. `/data/progress` on a volume) |
| Progress `source` | If body omits `source`, kickagent fills from `X-Kickagent-User-Email` |

Kickagent code and Railway vars are out of scope. Do not change kickagent in this pass.

## Env (kickstaff)

| Variable | Role |
| --- | --- |
| `PUBLIC_KICKAGENT_MANIFEST_URL` | Derive kickagent origin via `new URL(...).origin` (already used by `resolveKickagentApiBaseUrl()`) |
| `KICKAGENT_API_URL` | Optional override of that origin (same helper) |
| `KICKAGENT_SERVICE_TOKEN` | Private; same value as matching kickagent env. Sent as Bearer on proxy |

Staging must have both the manifest URL and the token set. Local: proxy targets 7099 only when kickagent runs with wiki/progress mounted on publish; Kickdesk standalone 7097/7095 are not this proxy’s job.

## Implement

### Shared helper

Add e.g. `src/lib/server/kickagentPathProxy.ts`:

1. Resolve base with existing [`resolveKickagentApiBaseUrl()`](../../../src/lib/server/kickagentRemoteRun.ts).
2. Upstream URL = `base + request.pathname + request.search` (preserve path; no rewrite).
3. Forward methods: `GET`, `HEAD`, `POST`, `PUT`, `DELETE`.
4. Request headers to set:
   - `Authorization: Bearer ${KICKAGENT_SERVICE_TOKEN}` (same read pattern as remote run)
   - `X-Kickagent-User-Id` / `X-Kickagent-User-Email` from `locals.user`
   - `Content-Type` when forwarding a body
5. Do **not** forward the browser `Cookie` or kickstaff session to kickagent.
6. Return upstream **status + body stream** plus useful response headers (`content-type`, `content-disposition`, `cache-control`, …). Do not buffer export downloads.
7. If base URL is missing → **502** with a clear plain-text message.

Patterns to copy: [`src/routes/api/kickagent/run/+server.ts`](../../../src/routes/api/kickagent/run/+server.ts), [`kickagentRemoteRun.ts`](../../../src/lib/server/kickagentRemoteRun.ts).

### Routes

Catch-alls (SvelteKit `+server.ts`):

- `src/routes/wiki/+server.ts`
- `src/routes/wiki/[...path]/+server.ts`
- `src/routes/progress/+server.ts`
- `src/routes/progress/[...path]/+server.ts`

Auth gate on every handler:

- **Any signed-in user** (any role). Not admin-only (unlike `/api/kickagent/run`).
- Signed out → **redirect 303 to `/login`** for navigations (use existing `requireUser` / equivalent). Spec acceptance requires this for `GET /wiki`.

### Do not

- Rewrite HTML or asset URLs (relative links must keep working on kickstaff origin).
- Expose the service token to the client.
- Mount wiki/progress on production kickagent (`publish` only).
- Add nav/menu links unless trivial; not required for acceptance.
- Expand into subscriber registry work.

## Acceptance

- [x] Signed-out `GET /wiki` → redirect to login. (route uses `requireKickagentProxyUser`)
- [ ] Signed-in **non-admin** `GET /wiki` → wiki HTML (200 through proxy). Manual on staging after deploy.
- [ ] Signed-in user can create a progress entry via `POST /progress/api/entries` (or the UI); blank `source` → stored email from session (`X-Kickagent-User-Email`). Manual on staging after deploy.
- [x] Direct `GET https://kickagent-staging.up.railway.app/wiki/` without Bearer stays **401** (verified 2026-10-30).
- [x] Unit tests cover: auth gate (unsigned → redirect), Bearer + user headers on outbound fetch, upstream URL = same path, missing base → 502. (`kickagentPathProxy.test.ts`)

When done: tick the wiki/progress lines in [kickstaff-subscriber-load.md](kickstaff-subscriber-load.md) §7 and note the proxies in [docs/now.md](../../now.md) if that bullet still lists them.

## Paste prompt for the kickstaff agent

> Implement [docs/guides/contracts/kickstaff-wiki-progress-proxy.md](docs/guides/contracts/kickstaff-wiki-progress-proxy.md) only. Add catch-all `/wiki` and `/progress` server routes: any signed-in user; forward to `resolveKickagentApiBaseUrl()` + same path with Bearer `KICKAGENT_SERVICE_TOKEN` and `X-Kickagent-User-Id` / `X-Kickagent-User-Email`; stream the response. Reuse `kickagentRemoteRun` / `api/kickagent/run` patterns. Do not do the subscriber registry rewrite. Meet this spec’s acceptance checks and tests.
