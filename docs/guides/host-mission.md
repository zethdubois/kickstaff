# Host mission — kickstaff as a generic kickagent consumer

**Read this before** kickagent resource UI, KAM console presentation, or any `resources.*` parse/render work. It is standing background, not the week’s queue. Session work still starts at [now.md](../now.md).

**Publisher contract (sibling wiki, when `kam:wiki` is up):** [manifest-resources.md](http://127.0.0.1:7097/kickagent/architecture/manifest-resources.md) · [CHANGELOG.md](http://127.0.0.1:7097/kickagent/CHANGELOG.md) · catalog example [gl-list.md](http://127.0.0.1:7097/kickagent/catalog/gl-list.md). If the wiki is down, the same files live under `../kickagent/docs/kickagent/`.

---

## Human summary

kickagent publishes **commands** and, when a command has a UI shape, a **`resources.<name>`** block in the manifest. kickstaff is the **reference host**: a small, working frontend that runs those commands and draws the UI the schema already describes.

The host is a **library of reusable builders**, not a folder of one-off screens per command name.

| Event | Host work |
| ----- | --------- |
| New command, **same UI class** (list table, detail form, text log) | Reload the manifest. Call the existing builder. Optional chrome (nav, title, route) is allowed. No new interpreter. |
| New command, **new UI class** (calendar, map, journal, wizard) | Add one reusable builder. Later commands of that class reuse it. |

Column lists, filter flags, field flags, and `clearValue` live in the **manifest**. The host must not own a growing map of `gl-*` or `units-*` constants. Hard-coding is allowed later as **elaboration** (prettier layout, extra actions). It is not the default path.

This repo did **not** start with that purity. Rental landings, hub cards, and some ops pages were product UI first. Treat leftover special cases as **debt**, not as the pattern to copy.

---

## 1. Kickstaff developer (this repo)

### What this frontend is

A **minimal functional consumer** of the kickagent command manifest:

- Auth and admin gate
- KAM palette + console (text first)
- Register `kickagent:<name>` from the catalog / plugin
- Run commands (`POST /api/kickagent/run`)
- When `presentationRef` + `resources.<name>` exist, build list/detail from **schema + `outcome.data`**
- Never parse pipe-separated `log` for layout

Product surfaces that are not command-driven (vanity rental sites, settings, users) stay ordinary SvelteKit. Do not force them through the manifest.

### Decision test (agents)

Before adding kickstaff code for a kickagent command:

1. Does `resources.<name>` (or a `presentationRef` the host already resolves) describe this UI class?
2. If **yes** — extend or call the generic builder. Do not add `src/lib/kickagent/<resource>Ops.ts` flag tables.
3. If **no** — the class is new. Add one builder and document the class. Do not invent a one-resource page that cannot be reused.

A new `resources.vendors` of the same shape as `resources.gl` is a **reload**, not a `/ops/vendors` rewrite. A dedicated route is optional chrome.

### Console vs page

| Surface | Job |
| ------- | --- |
| **KAM console** | Text. Print `log`, then one line per `data.rows` when present. One timestamp per command result. |
| **Ops page** | Programmatic UI from `resources.<name>`: filters → flags, table from `list.columns` + `data[rowsKey]`, detail from `data[recordKey]` + `detail.fields`, save from changed editable `flag`s. |

The console does not mount resource widgets. The page does not parse `log`.

### Known deviations (do not copy)

These exist because the app predates this mission. Prefer the generic path on every edit that touches them.

| Deviation | Why it is here | Direction |
| --------- | -------------- | --------- |
| Parser historically required `resources.units` and treated other keys as optional extras | Host grew around units first | Cache every `resources.<name>`; discover by key |
| `/ops/accounts` still has accounts-only filter/form constants (`glAccountForm`, custom list controls) | Built before `resources.gl` list-detail | **Done path:** drive from `class: list-detail` v2; generic filters + detail builders |
| Units detail uses `readonlyKeys` / no per-field `flag` / no `recordKey` | Older resource shape | Prefer GL v2 as the target shape; do not fork a third schema in the host |
| `feature-flow.md` in kickagent still says a new `resources.<name>` is a host change | Written when the host special-cased keys | Treat same-class resources as reload; only a **new class** extends the host library |
| Dedicated `/ops/units` and `/ops/accounts` routes | Useful chrome | Keep routes if they help; they should share one builder |

Hub cards, aliases, and rental marketing are **not** deviations from the consumer mission. They are other products in the same app.

### Agent anti-patterns

- Adding a `switch (resourceName)` that hardcodes flags already in the manifest
- Parsing `log` into columns
- Teaching the console a new widget for a command that already has a page
- Duplicating kickagent field maps “so the page works before reload”
- Opening a new ops route as the first response to a new `resources.*` key of a known class

---

## 2. Kickagent developer (roundtrip)

This section is what the **reference host** needs from the publisher so a generic frontend can stay generic. Edit the contract in the kickagent repo; this file only states the ask.

### Human summary for publishers

Ship the **command** and the **shape**. If the UI is a table and a form, publish `resources.<name>` with the same fields GL v2 already uses. Hosts should not need a prose essay per command. Changelog says “the shape moved.” The architecture page says **how any host interprets every resource**. Catalog pages are cheat sheets, not the interpreter.

### What to publish (machine)

For each UI-backed resource, one block under `manifest.resources.<name>`:

| Part | Host uses it to |
| ---- | --------------- |
| `list.columns`, `rowsKey`, `primaryKey` | Draw the table from `data[rowsKey]` |
| `list.filters[]` (`key`, `flag`, `type`, `match`, `label`) | Build filter controls and CLI args |
| `detail.recordKey`, `titleKey`, `submitCommand`, `fields[]` | Show `data[recordKey]`; `editable` / `flag` / `options` / `clearValue` |
| `update.fields` as `{ key, flag }` | Confirm save flags (detail `flag` is enough if they match) |
| `version` on the resource block | Detect schema class (GL **v2** is the current list/detail target) |

Outcomes stay dumb: `presentationRef` + `data`. Empty list = log only, no `data`. `match: "presence"` = flag with no value.

### What to write (humans and agents)

| Artifact | Job |
| -------- | --- |
| **`manifest-resources.md` (top)** | **Universal interpreter** — closed rules for any `resources.*` key: discover by key, filter `match` vocabulary, field type → control, identity vs edit flags, save diff, `presentationRef` resolution. Instances (`units`, `gl`) are examples, not separate products. |
| **`CHANGELOG.md` + catalog Changes** | Bump signal: resource key, resource version, field names that moved, one host sentence (“rebuild list/detail from schema; stop hardcoding”). Not the full algorithm. |
| **Catalog page** | Per-command flags and columns scraped from the live manifest. |
| **`feature-flow.md`** | Split **same class → reload** from **new class → host library extension**. Do not treat every new key as a new kickstaff parser. |

Wiki URLs on port **7097** are valid targeted reads when the wiki is running. Agents in kickstaff may `curl` them. Repo files are the fallback.

### What not to do

- Leave filter/flag maps only in kickstaff “until the page exists”
- Change outcome `data` shape without a changelog bump and interpreter note
- Document units and GL as two different host protocols if they are the same class
- Require a kickstaff PR for a new resource that already fits an existing builder

### Feedback this host still needs (open)

These are gaps in the **universal guide**, not missing GL column rows:

1. One written algorithm at the top of `manifest-resources.md` (discover → match → control → identity → save).
2. Lift `resources.units` toward the GL v2 field shape (`recordKey`, per-field `flag`) so one parser covers both.
3. Say explicitly that a new key of an existing class is a host **reload**.

Until (1) exists, kickstaff agents should still implement GL v2 from the published JSON + the GL section of that doc, and refuse to add more name-specific flag tables.

---

## Related

| Doc | Role |
| --- | ---- |
| [kickstaff-kickagent-consumer.md](contracts/kickstaff-kickagent-consumer.md) | Phases, security, what kickstaff owns |
| [kickagent-resource-ui.md](kickagent-resource-ui.md) | How this host renders resource data today |
| [kam-console.md](kam-console.md) | Console is text; pages are tables |
| [register-kickagent-command.md](register-kickagent-command.md) | Catalog → KAM; usually no per-command host TS |
| kickagent `manifest-resources.md` | Publisher schema (write the interpreter there) |
