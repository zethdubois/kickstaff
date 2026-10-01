/** Matches `.site-header` block height (padding + logo + border). */
export const SITE_HEADER_OFFSET = "calc(3.75rem + 1px)";

/** Matches `--kam-console-width` on `html` and `.kamConsole` width. */
export const KAM_CONSOLE_WIDTH = "min(420px, 90vw)";

export function siteHeaderBottomPx(): number {
  if (typeof document === "undefined") return 0;
  const header = document.querySelector(".site-header");
  return header?.getBoundingClientRect().bottom ?? 0;
}

export function consoleBandWidthPx(): number {
  if (typeof window === "undefined") return 420;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--kam-console-width")
    .trim();
  if (raw.endsWith("px")) {
    const parsed = Number.parseFloat(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  return Math.min(420, window.innerWidth * 0.9);
}

/** True when a pointer event falls in the console's fixed left column (below header). */
export function pointerTargetsConsoleBand(event: PointerEvent): boolean {
  return (
    event.clientX < consoleBandWidthPx() &&
    event.clientY >= siteHeaderBottomPx()
  );
}
