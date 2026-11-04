import { cities, rentalPagePath } from "$lib/cities";
import {
  opsResourceLinks,
  type OpsResourceLink,
} from "$lib/kickagent/opsResources";
import type { ManifestResources } from "$lib/kickagent/manifestResourceCache";

/** A page the location field can jump to. */
export type NavDestination = {
  label: string;
  href: string;
  /** `admin` destinations are omitted for every other role. */
  role: "user" | "admin";
};

/**
 * Signed-in pages with a stable URL. Ops pages are added from the loaded
 * manifest, not listed here. Labels match the site-header location text.
 */
export const STATIC_NAV_DESTINATIONS: readonly NavDestination[] = [
  { label: "Internal Ops Dashboard", href: "/", role: "user" },
  { label: "Dashboard", href: "/settings/dashboard", role: "user" },
  { label: "Add dashboard link", href: "/settings/add-link", role: "user" },
  { label: "Change password", href: "/account/password", role: "user" },
  ...cities.map(
    (city): NavDestination => ({
      label: city.label,
      href: rentalPagePath(city.slug),
      role: "user",
    }),
  ),
  { label: "Rental landing links", href: "/admin/rental-links", role: "admin" },
  { label: "Users", href: "/admin/users", role: "admin" },
  { label: "Ops datasets", href: "/admin/datasets", role: "admin" },
];

function opsDestination(link: OpsResourceLink): NavDestination {
  return { label: link.label, href: link.href, role: "admin" };
}

/** Destinations this role may open. Ops entries exist only for admins. */
export function listNavDestinations(
  role: string | null | undefined,
  resources: ManifestResources | null,
): NavDestination[] {
  if (!role) return [];
  const allowed = STATIC_NAV_DESTINATIONS.filter(
    (dest) => dest.role === "user" || role === "admin",
  );
  if (role !== "admin") return [...allowed];
  const ops = opsResourceLinks(resources).map(opsDestination);
  const seen = new Set(allowed.map((dest) => dest.href));
  return [...allowed, ...ops.filter((dest) => !seen.has(dest.href))];
}

/** Substring match on the label and the path. Empty query returns the full list. */
export function filterNavDestinations(
  destinations: readonly NavDestination[],
  query: string,
): NavDestination[] {
  const q = query.trim().toLowerCase();
  const pool = q
    ? destinations.filter(
        (dest) =>
          dest.label.toLowerCase().includes(q) ||
          dest.href.toLowerCase().includes(q),
      )
    : [...destinations];
  return pool.sort((a, b) => {
    if (q) {
      const aStart = a.label.toLowerCase().startsWith(q) ? 0 : 1;
      const bStart = b.label.toLowerCase().startsWith(q) ? 0 : 1;
      if (aStart !== bStart) return aStart - bStart;
    }
    return a.label.localeCompare(b.label);
  });
}
