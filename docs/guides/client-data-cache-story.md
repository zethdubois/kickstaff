# Draft story: client data cache (Svelte stores)

**Status:** Slice A is in the client. Ops lists (`/ops/[resource]`, `/ops/units`) keep one in-memory snapshot per resource, dataset, and server args (`src/lib/client/opsListCache.svelte.ts`). Column filters and sort are derived and do not refetch. Include flags, Refresh, and a database switch still load from Kickagent. Pending edits, row versions, and SSE (slices B–D) are not built.

**Audience:** Kickstaff agents and developers. Read this, then propose a plan (phases in `plan.md` / checklist in `now.md`). Do not implement from this file alone.

**Background:** Independent workshop narrative lives in Kickagent [`docs/kickagent/architecture/revamp-story.md`](../../../kickagent/docs/kickagent/architecture/revamp-story.md). Host contract (what is shipped / deferred): [`frontend-guide.md`](../../../kickagent/docs/kickagent/architecture/frontend-guide.md) → “Not in this contract yet.”

**Today:** List-detail and ops pages mostly run a Kickagent command and paint `outcome.data`. There is no shared normalized row cache, no pending-edit batch store, and no version/SSE conflict path.

---

## The story (Kickstaff terms)

The browser is a **cache**, not the source of truth. Postgres (ops dataset via the host) is authority. Kickagent remains the command publisher; for **data** commands it still queries with `opsDatabase`. For later **compute** commands, this host fetches authoritative rows, sends them to Kickagent, and commits proposed writes.

```text
Browser (Svelte stores)
  → ids + params + expectedVersions only
Kickstaff server
  → load authority from ops DB / check versions / run command or package compute
Kickagent
  → data: query with opsDatabase | compute: pure function, no DB write
Kickstaff server
  → commit writes (compute) / return outcome
  → later: NOTIFY → SSE → other clients patch stores
```

### Client responsibilities (target)

1. **Read-through cache** in Svelte stores, normalized by row id (per resource / table). Filters and sorts are derived views — do not re-fetch on every filter keystroke or re-render.
2. **Command requests** carry command name, row ids, params, and (when versions exist) `expectedVersions`. Do not send client-held row blobs as authority for compute or conflict-sensitive writes.
3. **Pending edits** in memory: `Map<rowId, Map<field, { old, new }>>` (or equivalent). Batch commit by default; immediate save is a batch of one on the same path. UI shows pending count.
4. **No persistence of the store in v1.** Close the tab → lose pending edits.
5. **Later:** SSE patches for rows other users changed; conflict UI when commit fails on version mismatch (keep mine / take theirs / discard).

### Server responsibilities (this repo)

1. Resolve active ops dataset; inject `opsDatabase` (already started).
2. On commit: fetch authoritative rows when the operation requires it; verify versions; run Kickagent; write compute results in a transaction when applicable.
3. Never trust the browser as the source of row contents for allocation-style work.
4. Later: LISTEN/NOTIFY on ops tables → SSE to connected admins. Single Kickstaff instance is enough at 1–10 users; no Redis for this.

### Kickagent impact

**None required for “caching.”** Caching is host chrome.

- Keep structured `outcome.data` (row ids clear).
- Optional later: row `version` on mutable ops tables and in list/show/update outcomes so this host can patch stores and check conflicts.
- Do not add a Kickagent “cache invalidate” API.
- `compute` commands (when they exist) stay pure: host sends fetched rows, Kickagent returns proposed writes.

---

## What good looks like (acceptance sketches)

Use these when turning the draft into a plan — not as a build checklist yet.

| Slice | Sketch |
| --- | --- |
| A — Store for one list-detail resource | After first list load, filter/sort does not re-call Kickagent; store keyed by record id |
| B — Pending + commit | Edit fields → pending badge → Commit sends one run path; success clears pending and refreshes or patches those ids |
| C — Versions | Ops rows have `version`; conflict response when expected version mismatches; simple conflict UI |
| D — Live patch | Second browser session sees updates without manual refresh (NOTIFY → SSE → refetch ids) |

Prefer A → B before C → D. Do not block Story A (`opsDatabase` fail-closed on Kickagent) on this work.

---

## Explicit non-goals (v1)

- Persisting pending edits to localStorage / IndexedDB
- Multi-server Kickstaff coordination / Redis
- Pessimistic row locks
- Replacing console text output with the store
- Forcing rental marketing pages through the cache

---

## Suggested agent next step

1. Diff this story against current list-detail (`KickagentListDetail*`, `/ops/[resource]`, form save paths).
2. Propose a phased plan in Kickstaff `docs/plan.md` / a new `now.md` focus when the human asks — with effort and risks.
3. Call out any Kickagent schema need (e.g. `version` column) as a sibling `now.md` item in kickagent; do not invent a new publisher protocol for the cache.
