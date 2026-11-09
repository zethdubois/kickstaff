/**
 * Klio transcript. `ask` posts to the host (`/api/klio`), which forwards to
 * Kickagent. The browser never calls devOrigin or sees the service token.
 */

import { pageLocation } from "$lib/client/pageLocation.svelte";
import { takeKlioSseEvents, type KlioSseEvent } from "./sse";

export type KlioRole = "user" | "klio";

export type KlioLine = {
  id: string;
  role: KlioRole;
  text: string;
  /** Epoch ms when the line was appended (panel clock column / hover). */
  ts: number;
};

export const KLIO_NOT_CONNECTED = "Klio is not connected yet.";

/** Dispatched on `window` after Klio opens; the panel focuses its input. */
export const KLIO_FOCUS_INPUT_EVENT = "klio-focus-input";

let _open = $state(false);
let _pending = $state(false);
let _nextId = 1;
let _lines = $state<KlioLine[]>([
  { id: "local", role: "klio", text: KLIO_NOT_CONNECTED, ts: Date.now() },
]);

function isStoredLine(value: unknown): value is KlioLine {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    (row.role === "user" || row.role === "klio") &&
    typeof row.text === "string" &&
    typeof row.ts === "number"
  );
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function applyKlioEvent(event: KlioSseEvent, reply: string): string {
  if (typeof event.delta === "string" && event.delta) return reply + event.delta;
  if (typeof event.error === "string" && event.error.trim() && !reply) return event.error;
  return reply;
}

/** Read the host SSE stream and publish each growth of the reply. */
async function readKlioStream(
  res: Response,
  onText: (text: string) => void,
): Promise<string> {
  if (!res.body) {
    const payload = (await res.json().catch(() => null)) as { reply?: unknown } | null;
    return payload && typeof payload.reply === "string" ? payload.reply : "";
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let reply = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const taken = takeKlioSseEvents(buffer);
    buffer = taken.rest;
    for (const event of taken.events) {
      const next = applyKlioEvent(event, reply);
      if (next !== reply) {
        reply = next;
        onText(reply);
      }
    }
  }
  if (buffer.trim()) {
    const taken = takeKlioSseEvents(`${buffer}\n\n`);
    for (const event of taken.events) {
      const next = applyKlioEvent(event, reply);
      if (next !== reply) {
        reply = next;
        onText(reply);
      }
    }
  }
  return reply;
}

export const klio = {
  get open(): boolean {
    return _open;
  },
  get lines(): readonly KlioLine[] {
    return _lines;
  },
  get pending(): boolean {
    return _pending;
  },
  close(): void {
    _open = false;
  },
  /** Drop the on-screen lines. Does not write a transcript row. */
  clearTranscript(): void {
    _lines = [];
  },
  /** Load the open thread for the active dataset. Empty store keeps the placeholder. */
  async hydrate(): Promise<void> {
    if (!isBrowser()) return;
    try {
      const res = await fetch("/api/klio");
      if (!res.ok) return;
      const body = (await res.json()) as { lines?: unknown };
      if (!Array.isArray(body.lines) || body.lines.length === 0) return;
      const lines = body.lines.filter(isStoredLine);
      if (lines.length === 0) return;
      _lines = lines;
    } catch {
      /* keep the screen as it is */
    }
  },
  /** Load a saved thread and show it. Returns false when the chat is gone. */
  async openChat(id: string): Promise<boolean> {
    if (_pending || !isBrowser()) return false;
    try {
      const res = await fetch("/api/klio/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) return false;
      const body = (await res.json()) as { lines?: unknown };
      const lines = Array.isArray(body.lines) ? body.lines.filter(isStoredLine) : [];
      _lines = lines;
      if (!_open) _open = true;
      return true;
    } catch {
      return false;
    }
  },
  /** Close the stored thread, clear the screen, and focus the input. */
  async newChat(): Promise<void> {
    if (_pending) return;
    if (isBrowser()) {
      try {
        await fetch("/api/klio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newChat: true }),
        });
      } catch {
        /* still clear the screen; the next ask opens a thread */
      }
    }
    _lines = [];
    if (!_open) _open = true;
    if (!isBrowser()) return;
    queueMicrotask(() => {
      window.dispatchEvent(new CustomEvent(KLIO_FOCUS_INPUT_EVENT));
    });
  },
  /** `]` — open and focus, or close. Opening reloads the stored thread. */
  toggle(): void {
    _open = !_open;
    if (!_open || !isBrowser()) return;
    void this.hydrate();
    queueMicrotask(() => {
      window.dispatchEvent(new CustomEvent(KLIO_FOCUS_INPUT_EVENT));
    });
  },
  /**
   * `klio:ask`. Empty text is not a turn (returns null).
   * Posts through `/api/klio`. Her reply is whatever that proxy returns.
   */
  async ask(raw: string): Promise<string | null> {
    const text = raw.trim();
    if (!text || _pending) return null;
    const transcript = _lines
      .filter(
        (line, index) =>
          !(index === 0 && line.role === "klio" && line.text === KLIO_NOT_CONNECTED),
      )
      .map((line) => ({ role: line.role, text: line.text }));
    const userId = `local-${_nextId++}`;
    const replyId = `local-${_nextId++}`;
    const now = Date.now();
    _lines = [
      ..._lines,
      { id: userId, role: "user", text, ts: now },
      { id: replyId, role: "klio", text: "", ts: now },
    ];
    if (!_open) _open = true;
    _pending = true;
    let reply = "";
    try {
      const res = await fetch("/api/klio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          transcript,
          context: { page: pageLocation.label },
        }),
      });
      reply = await readKlioStream(res, (next) => {
        _lines = _lines.map((line) =>
          line.id === replyId ? { ...line, text: next } : line,
        );
      });
    } catch {
      reply = KLIO_NOT_CONNECTED;
    } finally {
      _pending = false;
    }
    if (!reply.trim()) reply = KLIO_NOT_CONNECTED;
    _lines = _lines.map((line) =>
      line.id === replyId ? { ...line, text: reply } : line,
    );
    return reply;
  },
  /** Panel input. The verb is implied: this is `klio:ask`. */
  send(raw: string): Promise<string | null> {
    return this.ask(raw);
  },
};
