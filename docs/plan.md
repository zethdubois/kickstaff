# Plan

Living roadmap. **plan vs now:** this file is **phase outcomes** (is the phase done?). Session-level commands live in [now.md](now.md). Do not maintain the same checklist in both.

**Closing a phase:** tick outcomes here, mark the status row **Done**, then rewrite `now.md` for the next phase. Full steps: [.agent/SOP.md — Closing a phase](../.agent/SOP.md#closing-a-phase).

kickstaff is the **reference host** for kickagent’s command manifest. Office data and commands live in kickagent; this repo authenticates, runs `kickagent:*`, and builds UI from `resources.*` by **class**. Standing aim: [guides/host-mission.md](guides/host-mission.md). Publisher roadmap: [kickagent plan](../../kickagent/docs/plan.md).

Host phase ids use **H** so they are not confused with kickagent’s 1a/1b/… numbers. H1 tracks the host side of kickagent **1a** (GL). H2 tracks the host side of kickagent **1b** (properties list from manifest).

## Phase status

| Phase | Name | Status | Proof (when Done) |
| ----- | ---- | ------ | ----------------- |
| H1 | Generic list-detail host (GL) | **In progress** — see [now.md](now.md) | — |
| H2 | Properties (and later resources) via reload | Not started | — |
| H3 | Units lift to list-detail | Not started (waits on kickagent) | — |

---

## Phase H1 — Generic list-detail host (GL)

**Goal:** kickstaff consumes `resources.gl` (`class: "list-detail"`, resource version 2) with reusable builders. No accounts-only flag tables. Aligns with kickagent phase **1a Done** (package **0.3.0**).

**Outcomes:**

- [x] Standing host mission documented; agents read it before `resources.*` work.
- [x] Manifest parser discovers list-detail by `class` (and still accepts units v1).
- [x] `/ops/accounts` list/detail/save driven from schema filters, `recordKey`, and field `flag`s.
- [ ] Human smoke: accounts page against a live **0.3.0+** manifest (filters + save).

**Acceptance:** An admin can list, filter, open, and save a GL account in kickstaff without host code that names `--include-hidden` or GL edit flags outside the cached schema.

**Optional leftovers (do not block Done):** console polish, hub card labeling.

---

## Phase H2 — Properties via reload

**Goal:** When kickagent publishes a list-detail `resources.properties` (kickagent **1b**), kickstaff lists it with the **same** builders. Reload first; route chrome only if useful.

**Outcomes:**

- [ ] After publisher ships the resource: `kam:reload-kickagent` (or re-login) caches it with no new flag maps.
- [ ] List (and detail if published) works in KAM and/or a thin `/ops/…` chrome page.

**Acceptance:** Properties appear from the manifest the same way accounts do. No properties-only form constants.

---

## Phase H3 — Units lift to list-detail

**Goal:** Drop the thin units v1 parser path once kickagent publishes units as list-detail.

**Outcomes:**

- [ ] `/ops/units` uses the list-detail builders.
- [ ] v1-only units parse path removed or reduced to a short-lived fallback.

**Acceptance:** One host path for every list-detail resource, including units.

---

## Delivered (so far)

| Artifact | Where |
| -------- | ----- |
| Host mission | [guides/host-mission.md](guides/host-mission.md) |
| list-detail builders | `KickagentListFilters`, `KickagentListDetailSplitView`, `listDetailForm.ts` |
| Accounts chrome | `/ops/accounts` |
| Console text rows | `listRowLine.ts` + shared result timestamp |
