/**
 * Command registry for the KAM dev palette.
 *
 * Each command is a handler that does its work and optionally returns a
 * `CommandOutcome` describing the post-action to run after successful
 * execution:
 *   1. refresh target keys (run in order; missing target is an error)
 *   2. klog lines (written last; final post-action)
 *
 * Commands that don't need a post-action return `void`.
 */

import {
  devConsole,
  klogError,
  klogWithSource,
  type KlogLevel,
} from "./state.svelte";
import { listRefreshTargets, runRefreshTarget } from "./refresh";

export type CommandOutcome = {
  refresh?: string[];
  log?: string | string[];
  level?: KlogLevel;
};

export type CommandHandler = (
  args: string[],
) => CommandOutcome | void | Promise<CommandOutcome | void>;

export type CommandResult = { ok: true } | { ok: false; error: string };

const commands = new Map<string, CommandHandler>();

export function registerCommand(name: string, handler: CommandHandler): void {
  commands.set(name.toLowerCase(), handler);
}

export function listCommands(): string[] {
  return [...commands.keys()].sort();
}

function logLines(outcome: CommandOutcome | void, source: string): void {
  if (!outcome || outcome.log === undefined) return;
  const level: KlogLevel = outcome.level ?? "log";
  const lines = Array.isArray(outcome.log) ? outcome.log : [outcome.log];
  for (const line of lines) {
    if (line === undefined || line === null) continue;
    klogWithSource(level, source, String(line));
  }
}

export async function runCommand(input: string): Promise<CommandResult> {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: "empty command" };

  const [rawName, ...args] = trimmed.split(/\s+/);
  if (!rawName) return { ok: false, error: "empty command" };

  const name = rawName.toLowerCase();
  const source = `command:${name}`;
  const handler = commands.get(name);
  if (!handler) {
    const msg = `unknown command: ${rawName}`;
    klogError(msg);
    return { ok: false, error: msg };
  }

  let outcome: CommandOutcome | void;
  try {
    outcome = await handler(args);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    klogWithSource("error", source, `${name}: ${msg}`);
    return { ok: false, error: msg };
  }

  const refreshTargets = outcome?.refresh ?? [];
  for (const target of refreshTargets) {
    try {
      const ok = await runRefreshTarget(target);
      if (!ok) {
        const msg = `unknown refresh target: ${target}`;
        klogWithSource("error", source, msg);
        return { ok: false, error: msg };
      }
      klogWithSource("info", source, `refreshed ${target}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      klogWithSource("error", source, `refresh ${target} failed: ${msg}`);
      return { ok: false, error: msg };
    }
  }

  logLines(outcome, source);
  return { ok: true };
}

registerCommand("console", (): CommandOutcome => {
  devConsole.toggleConsole();
  return { log: `console ${devConsole.consoleOpen ? "opened" : "closed"}` };
});

registerCommand("clear", () => {
  devConsole.clear();
});

registerCommand("help", (): CommandOutcome => {
  const lines: string[] = [
    `commands: ${listCommands().join(", ")}`,
    "hotkey: ctrl+/ (or cmd+/) toggles the palette",
  ];
  const targets = listRefreshTargets();
  if (targets.length > 0) {
    lines.push(`refresh targets: ${targets.join(", ")}`);
  }
  return { log: lines };
});

registerCommand("echo", (args): CommandOutcome => {
  return { log: args.join(" ") };
});

registerCommand("reset", async (args): Promise<CommandOutcome> => {
  const target = args[0]?.trim();
  if (!target) {
    throw new Error("usage: reset <vendor> | reset --all-parsed");
  }

  const allParsed = target === "--all-parsed";
  const vendor = allParsed ? "" : target;

  const res = await fetch("/api/admin/bills/reset", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(allParsed ? { allParsed: true } : { vendor }),
  });

  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    /* ignore; handled below */
  }

  if (!res.ok) {
    const msg =
      payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message?: unknown }).message ?? "reset failed")
        : "reset failed";
    throw new Error(msg);
  }

  const updatedCount =
    payload && typeof payload === "object" && "updatedCount" in payload
      ? Number((payload as { updatedCount?: unknown }).updatedCount ?? 0)
      : 0;
  const safeCount = Number.isFinite(updatedCount) ? updatedCount : 0;

  const scope = allParsed ? "all parsed documents" : `vendor "${vendor}"`;
  return {
    refresh: ["bills.recent-docs"],
    log: `reset complete for ${scope} — ${safeCount} document(s) moved parsed -> received`,
  };
});
