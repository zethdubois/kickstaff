# Admin: Users (dev FAQ)

**Audience:** Developers and agents editing [`src/routes/admin/users/+page.svelte`](../../src/routes/admin/users/+page.svelte) and [`+page.server.ts`](../../src/routes/admin/users/+page.server.ts). This is **not** end-user documentation.

## Purpose

Manage **accounts**: create users with random initial passwords, reset passwords, delete users, and send email when mail is configured.

## Access

- **Route:** `/admin/users`
- **Guard:** `requireAdmin` in `load` and all actions.

## Actions (server)

| Action | Notes |
|--------|--------|
| `create` | Inserts user; emails invite if mail send succeeds; returns `generatedPassword` once for admin copy. |
| `reset` | New random password, `mustChangePassword = true`, password reset email when possible. |
| `delete` | Cannot delete self; cannot delete user whose email matches `ADMIN_EMAIL` (seed protection). |

## UI behavior

- **SUPER badge** — Row matching `ADMIN_EMAIL` in env (resolved to `protectedDeleteUserId` in load) shows a “super” pill; **no Delete** button for that row.
- **Delete** — Two-step: first click arms confirm for 3s, second submits; `aria-live` for assistive tech.
- **Email** — If SMTP not configured or `MAIL_DEV_ONLY`, mail may be logged only; banners reflect `emailSent` where applicable.

## Env

- `ADMIN_EMAIL` — From address for mail; also identifies protected seed admin for delete UI and delete action.
- Mail vars: see [`.env.example`](../../.env.example) and [`AGENTS.md`](../../AGENTS.md).

## Related

- Schema: [`users`](../../src/lib/server/schema.ts), sessions cascade on delete.
- Mail: [`src/lib/server/mail.ts`](../../src/lib/server/mail.ts).
