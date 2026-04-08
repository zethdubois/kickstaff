# RentalLandingGrid — FAQ

## Purpose

City rental landing layout: **nav tiles** (short/long listings, apply, contact) and a **main column** that either shows marketing content or an embedded AppFolio listings iframe after the user picks a tile.

## Props / data

- **`links`** — `CityAppfolioLinks`: URLs for short-term, long-term, apply, contact (from server / DB).
- **`title`**, **`tagline`** — City branding text.
- **`theme`** — `CitySlug` (`cda` | `mos` | `spt`) for styling and behavior.
- **`listingEmbedUrl`** — AppFolio `/listings` embed URL or `null` if iframe should not be used.
- **`landingHeroImageUrl`**, **`landingHeadline`**, **`landingBody`** — Optional hero when the iframe is not shown.

## Behavior

- **Tiles:** Only render links that have a URL; empty tiles are hidden.
- **Iframe:** Loads `listingEmbedUrl` only after a nav tile is clicked; until then the main column can show the landing frame (hero, headline, body).
- **Theme:** `theme` is read in `$effect` to reset iframe state when switching cities.

## Edge cases

- Missing `listingEmbedUrl` — no iframe; landing content only.
- No tile URLs — grid may be empty; layout should still be usable.

## Related

- Imported by city routes under `src/routes/` (e.g. `cda`, `mos`, `spt`).
- Uses `RentalLandingFrame.svelte` for the main column content.
- AppFolio URLs are edited in admin (`/admin/rental-links`) and stored in Postgres (`rental_landing_links`).
