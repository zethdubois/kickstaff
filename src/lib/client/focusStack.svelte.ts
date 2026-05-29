/**
 * Tracks which shell layer sits above the KAM console (z-index 900).
 * Console wins by default when open; main content rises on pointer/focus.
 */

export type FocusStackLayer = "console" | "main";

let _activeLayer = $state<FocusStackLayer>("console");

export const Z_CONSOLE_BASE = 900;
export const Z_CONSOLE_TOP = 901;
export const Z_MAIN_ELEVATED = 901;

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
