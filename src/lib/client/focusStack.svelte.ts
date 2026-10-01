/**
 * Tracks which shell layer sits above the KAM console.
 * Console wins by default when open; main content rises on pointer/focus.
 *
 * The site header stays above the console. Page content is not given its
 * own z-index, so scrolling it cannot cover the header, and popup overlays
 * (command palette, contact dialog) can still sit above the header.
 */

export type FocusStackLayer = "console" | "main";

let _activeLayer = $state<FocusStackLayer>("console");

export const Z_CONSOLE_BASE = 900;
export const Z_CONSOLE_TOP = 901;
export const Z_MAIN_ELEVATED = 901;
export const Z_SITE_HEADER = 950;
export const Z_MODAL = 1100;

export const focusStack = {
  get activeLayer(): FocusStackLayer {
    return _activeLayer;
  },
  focusMain(): void {
    _activeLayer = "main";
  },
  focusConsole(): void {
    _activeLayer = "console";
  },
  reset(): void {
    _activeLayer = "console";
  },
};
