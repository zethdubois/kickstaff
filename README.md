# publicweb — Kick Asset Management

Rental marketing pages for three cities (CDA, Moscow, Sandpoint) plus an internal ops dashboard, built with SvelteKit and PostgreSQL.

*Current as of May 12, 2026.*

---

## Admin dashboard

The internal dashboard lives at **https://www.kickassetmanagement.com**.

Login with an admin account to access:

- **Rental links editor** (`/admin/rental-links`) — configure per-city link destinations, landing page content, and WYSIWYG design overrides for all three rental sites.
- **WYSIWYG theme panel** — click the gear icon on any city rental page to edit nav column colors/fonts, landing column typography, and hero image positioning. Changes auto-save.
- **User management** (`/admin/users`) — manage admin accounts.

## Rental sites — public URLs

Each city has a vanity domain (apex + www both work as of May 2026):

| City | Apex | www |
|---|---|---|
| Moscow | moscowidahorental.com | www.moscowidahorental.com |
| CDA | cda-rental.com | www.cda-rental.com |
| Sandpoint | rent-sandpoint.com | www.rent-sandpoint.com |

## Link destinations

### Long-term rentals

All three sites point to their respective **AppFolio property group** via the embedded listings iframe. The AppFolio property group names match the city labels:

| Site | Property group |
|---|---|
| CDA | `CDA` |
| Moscow | `Moscow` |
| Sandpoint | `Sandpoint` |

### Short-term rentals

Each city links to an external booking platform (not AppFolio):

- **Moscow:** `https://186374_1.holidayfuture.com/`
- **Sandpoint:** `https://resnexus.com/resnexus/reservations/book/58E27E80-9578-47E9-BF60-DCB4CC22E962`
- **CDA:** *none configured*

### Resnexus iFrame restriction & new-tab workaround

Resnexus.com does **not** allow its pages to be served inside a third-party iframe (X-Frame-Options: DENY). To handle this, the admin panel includes an **"Open in new tab"** checkbox per link (added May 2026):

- When checked, clicking the tile opens the destination URL in a new browser tab (`target="_blank"`)
- When unchecked, the URL loads inside the site's embedded iframe (default behavior for compatible URLs)

This checkbox is available for short-term, long-term, apply, and contact links individually.

### Tenant portal

The tenant portal link always opens in a new tab and is shown at the bottom of the sidebar when configured.

## Contact form

The "Contact us" tile opens an inline modal with name/email/message fields. Submissions POST to `/api/rental-contact` and are delivered to the configured admin email.

## Site structure

```
src/
├── routes/
│   ├── cda/             # Coeur d'Alene rental page
│   ├── mos/             # Moscow rental page
│   ├── spt/             # Sandpoint rental page
│   ├── admin/           # Admin tooling (rental links, users)
│   └── tools/           # Internal ops tools (bills, reports)
├── lib/
│   ├── client/          # Client-side stores (UI settings)
│   ├── server/          # DB schema, auth, guards, upsert logic
│   ├── RentalLandingGrid.svelte   # Main rental page layout
│   ├── RentalLandingFrame.svelte  # Hero/headline/body column
│   ├── RentalWysiwygGear.svelte   # Admin WYSIWYG theme panel
│   └── RentalContactModal.svelte  # Contact form modal
└── hooks.server.ts      # Auth gate + vanity host bypass
```

## Tech stack

- **Framework:** SvelteKit (Node adapter)
- **Package manager:** pnpm
- **Database:** PostgreSQL via Drizzle ORM
- **Session auth:** Cookie-based with bcrypt password hashing
- **Hosting:** Railway
