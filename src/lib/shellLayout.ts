/** Matches `.site-header` block height (padding + logo + border). */
export const SITE_HEADER_OFFSET = "calc(3.75rem + 1px)";

export function siteHeaderBottomPx(): number {
  if (typeof document === "undefined") return 0;
  const header = document.querySelector(".site-header");
  return header?.getBoundingClientRect().bottom ?? 0;
}

export function consoleBandWidthPx(): number {
  if (typeof window === "undefined") return 420;
  return Math.min(420, window.innerWidth * 0.9);
}

/** True when a pointer event falls in the console's fixed left column (below header). */
export function pointerTargetsConsoleBand(event: PointerEvent): boolean {
  return (
    event.clientX < consoleBandWidthPx() &&
    event.clientY >= siteHeaderBottomPx()
  );
}
