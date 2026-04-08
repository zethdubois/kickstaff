# RentalLandingGrid — FAQ

## Purpose

City rental landing layout: **nav tiles** (short/long listings, apply, contact) and a **main column** that either shows marketing content or an embedded AppFolio listings iframe after the user picks a tile.

## Props / data

- **`links`** — `CityAppfolioLinks`: URLs for short-term, long-term, apply, contact (from server / DB).
- **`title`**, **`tagline`** — City branding text.
- **`theme`** — `CitySlug` (`cda` | `mos` | `spt`) for styling and behavior.
- **`listingEmbedUrl`** — AppFolio `/listings` embed URL or `null` if iframe should not be used.
- **`landingHeroImageUrl`**, **`landingHeadline`**, **`landingBody`** — Optional hero when the iframe is not shown.
- **`links.wysiwyg`** — Optional per-city WYSIWYG overrides (`RentalWysiwygTheme` from `rental_landing_links`): nav column and landing column colors, font stacks, and max widths (px). Null means use the built-in city theme CSS (`rentalLanding--cda` / `--mos` / `--spt`).

## Admin WYSIWYG (preview)

**Who:** Logged-in users with `role === 'admin'` on the public city pages (`/cda`, `/mos`, `/spt`).

**UI:** A gear control appears at the top-left of (1) the **left nav column**, (2) the **hero / banner** area, and (3) the **landing main column** (headline/body). Each opens a small panel:

| Area | Controls |
|------|-----------|
| Nav | Background & text (hex swatch + text field), font preset, column width slider (200–480 px). |
| Hero | HTTPS image URL and/or **file upload** (JPEG/PNG/WebP/GIF, ≤ 4 MB). Uploads are written under `static/rental-media/{citySlug}/` and the **public path** `/rental-media/...` is stored in `landing_hero_image_url` (same column as external URLs). |
| Landing | Background & text, font preset, reading width slider (320–900 px). |

**APIs:** `POST /api/admin/rental-theme` (JSON body with `citySlug` and all eight theme fields), `POST /api/admin/rental-hero-upload` (`multipart/form-data`: `citySlug`, `file`), and existing `POST /api/admin/rental-landing` for hero/headline/body text. **Auth:** session cookie; admin only.

**DB:** Columns `nav_wysiwyg_*`, `landing_wysiwyg_*` on `rental_landing_links`. The **Admin → Rental links** form does not edit these fields; saving that form **preserves** WYSIWYG columns by merging the existing row before upsert.

**Deploy:** Uploaded files live under `static/rental-media/` (gitignored); ensure the directory is writable on the server or use external storage in production if needed.

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
