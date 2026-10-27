import type { Handle } from "@sveltejs/kit";
import { redirect } from "@sveltejs/kit";
import { vanityPathForRootHost } from "$lib/vanityHosts";
import {
  activeSessionCookieName,
  deleteSessionForToken,
  getUserFromSessionToken,
  isPasswordChangeExemptPath,
} from "$lib/server/auth";
import {
  DB_TARGET_COOKIE,
  resolveTargetForRequest,
  runWithDbTarget,
  setDbTargetCookie,
} from "$lib/server/dbTarget";

/**
 * Auth gate: only the **main-host** `/` (ops hub) requires a session.
 * Other paths are not listed here — they stay public unless a route’s own `load` checks `locals`.
 * Vanity domains: `/` maps to a city route without requiring login (see `hooks.ts` reroute).
 *
 * Every request runs against ONE database (request-scoped; see `dbTarget.ts`) and uses
 * that database's own session cookie (`ka_session_<target>`), so a session in one
 * database never authenticates you against another.
 */
export const handle: Handle = async ({ event, resolve }) => {
  const picked = resolveTargetForRequest({
    pathname: event.url.pathname,
    dbParam: event.url.searchParams.get("db"),
    cookie: event.cookies.get(DB_TARGET_COOKIE),
  });
  if (picked.setCookie) {
    setDbTargetCookie(event.cookies, event.url, picked.target);
  }
  event.locals.dbParamRejected = picked.dbParamRejected;

  return runWithDbTarget(picked.target, async () => {
    const vanityTarget = vanityPathForRootHost(event.url.hostname);
    const isRootPath = event.url.pathname === "/" || event.url.pathname === "";
    if (isRootPath && vanityTarget) {
      return resolve(event);
    }

    const cookieName = activeSessionCookieName();
    const sessionToken = event.cookies.get(cookieName);
    let user: Awaited<ReturnType<typeof getUserFromSessionToken>> = null;

    if (sessionToken) {
      try {
        user = await getUserFromSessionToken(sessionToken);
      } catch {
        user = null;
      }
      if (!user) {
        await deleteSessionForToken(sessionToken).catch(() => {});
        event.cookies.delete(cookieName, { path: "/" });
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
  });
};
