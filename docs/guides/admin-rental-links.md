# Admin: Rental links (dev FAQ)

**Audience:** Developers and agents editing [`src/routes/admin/rental-links/+page.svelte`](../../src/routes/admin/rental-links/+page.svelte) and [`+page.server.ts`](../../src/routes/admin/rental-links/+page.server.ts). This is **not** end-user documentation.

## Purpose

Edit **per-city** AppFolio and marketing URLs stored in Postgres (`rental_landing_links`). Each city tab (`cda`, `mos`, `spt`) maps to one row keyed by `city_slug`.

## Access

- **Route:** `/admin/rental-links`
- **Guard:** `requireAdmin` in `load` and actions — only users with `role === 'admin'`.

## UI behavior

- **Tabs** — Query `?city=<slug>` selects the active city; keyboard navigation on tablist (arrows, Home, End).
- **Save** — Form `action="?/save"` per city panel; success updates URL via `goto` to match saved city when needed.
- **URLs** — Optional URL fields use `https://` validation where enforced in server; empty can mean “hide tile” per field semantics (see server messages).

## Server (`+page.server.ts`)

- Validates optional landing fields (headline length, body max, hero image `https`, etc.).
- Persists to `rentalLandingLinks` table; see schema for column names (`short_term_url`, `listing_property_group`, etc.).

## Related

- Public city routes load these rows in `+page.server.ts` under `/cda`, `/mos`, `/spt`.
- Cities list comes from [`$lib/cities`](../../src/lib/cities.ts).
