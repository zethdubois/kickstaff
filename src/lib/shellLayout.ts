/** Matches `--kam-console-width` on `html` and `.kamConsole` width. */
export const KAM_CONSOLE_WIDTH = "min(370px, 90vw)";

export function consoleBandWidthPx(): number {
  if (typeof window === "undefined") return 370;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--kam-console-width")
    .trim();
  if (raw.endsWith("px")) {
    const parsed = Number.parseFloat(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  return Math.min(370, window.innerWidth * 0.9);
}

/** True when a pointer event falls in the console's full-height left column. */
export function pointerTargetsConsoleBand(event: PointerEvent): boolean {
  return event.clientX < consoleBandWidthPx();
}
