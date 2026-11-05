/**
 * Klio panel state. Chrome only: the transcript lives in this browser.
 * Kickagent does not serve /klio yet, so send never leaves the page.
 */

export type KlioRole = "user" | "klio";

export type KlioLine = {
  id: number;
  role: KlioRole;
  text: string;
};

export const KLIO_NOT_CONNECTED = "Klio is not connected yet.";

/** Dispatched on `window` after Klio opens; the panel focuses its input. */
export const KLIO_FOCUS_INPUT_EVENT = "klio-focus-input";

let _open = $state(false);
let _nextId = 2;
let _lines = $state<KlioLine[]>([
  { id: 1, role: "klio", text: KLIO_NOT_CONNECTED },
]);

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export const klio = {
  get open(): boolean {
    return _open;
  },
  get lines(): readonly KlioLine[] {
    return _lines;
  },
  close(): void {
    _open = false;
  },
  /** `]` — open and focus, or close. */
  toggle(): void {
    _open = !_open;
    if (!_open || !isBrowser()) return;
    queueMicrotask(() => {
      window.dispatchEvent(new CustomEvent(KLIO_FOCUS_INPUT_EVENT));
    });
  },
  /**
   * `klio:ask`. Empty text is not a turn (returns null).
   * The reply stays in the browser until the host proxies `/klio`.
   */
  ask(raw: string): string | null {
    const text = raw.trim();
    if (!text) return null;
    const userId = _nextId++;
    const replyId = _nextId++;
    _lines = [
      ..._lines,
      { id: userId, role: "user", text },
      { id: replyId, role: "klio", text: KLIO_NOT_CONNECTED },
    ];
    return KLIO_NOT_CONNECTED;
  },
  /** Panel input. The verb is implied: this is `klio:ask`. */
  send(raw: string): void {
    this.ask(raw);
  },
};
