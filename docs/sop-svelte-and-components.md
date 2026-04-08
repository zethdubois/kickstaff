# SOP: Svelte files and component documentation

This document is the **single standard** for structuring `.svelte` files, wiring agents to the documentation pipeline, and maintaining **guides** under [`docs/guides/`](guides/).

**Audience:** Everything in `docs/guides/` is **developer / agent** reference (implementation, behavior, file pointers). These are **not** end-user support FAQs, and agents are not expected to treat them as customer-facing copy.

- Repo-wide context: [AGENTS.md](../AGENTS.md)
- Environment reference: [../.env.example](../.env.example)

## File layout (all `.svelte` files)

1. **File header** — HTML comment block (see below). Place it at the **very top** of the file, before `<script>`. See lib vs route rules below.
2. `<script lang="ts">` — imports, props (`$props`), state (`$state`), derived (`$derived`), effects (`$effect`) as needed.
3. Markup — template.
4. `<style>` — component styles when present.

## Required file header

Every `.svelte` file should start with a short HTML comment that points readers (humans and agents) to this SOP and, for lib components, to the paired FAQ.

### `src/lib/**/*.svelte` (components)

```html
<!--
  @docs: docs/sop-svelte-and-components.md
  @component: ComponentName.svelte
  @faq: docs/guides/ComponentName.md
-->
```

- **`@docs`** — This SOP (path from repository root).
- **`@component`** — The component filename only.
- **`@faq`** — Path to the FAQ markdown file in `docs/guides/`, **same basename** as the component (e.g. `RentalLandingGrid.svelte` → `docs/guides/RentalLandingGrid.md`).

### `src/routes/**/*.svelte` (pages and layouts)

Always include `@docs`. **Omit** `@component` (that tag is only for lib files).

**`@faq` — optional.** Use when there is a **developer guide** for that screen (e.g. admin flows). Point to a stable name such as `docs/guides/admin-rental-links.md`. If there is no guide, omit `@faq` entirely.

```html
<!--
  @docs: docs/sop-svelte-and-components.md
  @faq: docs/guides/admin-rental-links.md
-->
```

## Guides (`docs/guides/`)

All guides here are **dev/agent** references, not end-user FAQs.

### Lib components (`src/lib/**/*.svelte`)

- **Naming:** Must match the component filename: `FooBar.svelte` → `docs/guides/FooBar.md`.
- **Header:** Use `@component` and `@faq` as shown above.

### Routes (optional dev guides)

- **Naming:** Use a clear slug, e.g. `docs/guides/admin-users.md` for `/admin/users`.
- **Header:** Include `@faq` when the guide exists.

### Suggested sections (components)

- **Purpose** — One or two sentences.
- **Props / data** — What the parent must pass; types if helpful.
- **Behavior** — User-visible behavior, navigation, iframes, etc.
- **Edge cases** — Empty data, loading, mobile, known limitations.
- **Related** — Importing routes or server modules worth knowing about.

### Suggested sections (admin / complex routes)

- **Audience** — State that the doc is dev-only.
- **Purpose**, **Access / guards**, **Actions or API**, **UI behavior**, **Env**, **Related files**.

Stubs are fine; expand when the surface grows.

## Naming conventions

| Kind | Convention |
|------|----------------|
| Svelte components (`src/lib`) | PascalCase + `.svelte` |
| Route segments | kebab-case where applicable; SvelteKit reserved names (`+page`, `+layout`, `+server`, `+error`) |
| Colocated server loads / actions | `+page.server.ts`, `+layout.server.ts` next to the route |
| Server-only code | `src/lib/server/*.ts` — DB, auth, mail, guards |

## Checks

Run `pnpm check` after substantive edits to Svelte components and TypeScript.
