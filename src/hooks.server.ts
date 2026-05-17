import type { Handle } from "@sveltejs/kit";
import { redirect } from "@sveltejs/kit";
import { vanityPathForRootHost } from "$lib/vanityHosts";
import {
  SESSION_COOKIE,
  deleteSessionForToken,
  getUserFromSessionToken,
  isPasswordChangeExemptPath,
} from "$lib/server/auth";
import {
  DB_TARGET_COOKIE,
  syncDbTargetFromCookie,
} from "$lib/server/dbTarget";

/**
 * Auth gate: only the **main-host** `/` (ops hub) requires a session.
 * Other paths are not listed here — they stay public unless a route’s own `load` checks `locals`.
 * Vanity domains: `/` maps to a city route without requiring login (see `hooks.ts` reroute).
 */
export const handle: Handle = async ({ event, resolve }) => {
  await syncDbTargetFromCookie(event.cookies.get(DB_TARGET_COOKIE));

  const vanityTarget = vanityPathForRootHost(event.url.hostname);
  const isRootPath = event.url.pathname === "/" || event.url.pathname === "";
  if (isRootPath && vanityTarget) {
    return resolve(event);
  }

  const sessionToken = event.cookies.get(SESSION_COOKIE);
  let user: Awaited<ReturnType<typeof getUserFromSessionToken>> = null;

  if (sessionToken) {
    try {
      user = await getUserFromSessionToken(sessionToken);
    } catch {
      user = null;
    }
    if (!user) {
      await deleteSessionForToken(sessionToken).catch(() => {});
      event.cookies.delete(SESSION_COOKIE, { path: "/" });
    }
  }

  // Dev-only: allow ephemeral agent impersonation via `?as_agent=1` when
  // `AGENT_EMAIL` is set in the environment. This avoids seeding the DB and
  // is strictly guarded to non-production environments.
  if (!user && process.env.NODE_ENV !== "production") {
    const asAgent = event.url.searchParams.get("as_agent") === "1";
    const agentEmail = process.env.AGENT_EMAIL;
    if (asAgent && agentEmail) {
      user = {
        id: "agent-local",
        email: agentEmail,
        role: "admin",
        mustChangePassword: false,
      };
    }
  }

  event.locals.user = user;

  if (
    user?.mustChangePassword &&
    !isPasswordChangeExemptPath(event.url.pathname)
  ) {
    throw redirect(303, "/account/password");
  }

  if (event.url.pathname === "/" && !vanityTarget && !user) {
    throw redirect(303, "/login");
  }

  return resolve(event);
};
