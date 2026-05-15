# publicweb — Kickagent Hello World Integration

**Audience:** Developer working in **publicweb**.

**Consumer guide:** [publicweb-kickagent-consumer.md](publicweb-kickagent-consumer.md). **Phase 1 package:** [kickagent-essentials-spec.md](kickagent-essentials-spec.md). **KAM console:** [../kam-console.md](../kam-console.md).

---

## Overview

- **kickagent** owns the pure function: `helloWorld(userId, userEmail, logger)`.
- **publicweb** owns the thin wrapper: import, logger shim, console command registration.
- **Shared boundary:** function signature and `KlogBroadcaster` shape (defined in both repos; see essentials spec).

---

## What is wired

| Item | Value |
|------|--------|
| Console command | `kickagent:hello` (or `hello` in [kickagent shell](../kam-console.md#kickagent-shell-ka-mode)) |
| User context | `page.data.user` (`SessionUser`) |
| Logger | Local shim → `klogWithSource` (source tag `kickagent:hello`) |
| Result | `CommandOutcome.log` with returned `message` |

---

## Code locations

### Command registration

[`src/lib/kickagent/registerHelloCommand.ts`](../../../src/lib/kickagent/registerHelloCommand.ts)

- Imports `helloWorld` from the `kickagent` package.
- `registerKickagentCommand("hello", ...)` registers `kickagent:hello` and calls `helloWorld(user.id, user.email, logger)`.
- Returns `{ log: result.message, level: "info" }` so the runner writes a final klog line.

### Layout hook (admin only)

[`src/routes/+layout.svelte`](../../../src/routes/+layout.svelte) — inside `onMount`, when `isAdmin`:

```ts
registerKickagentHelloCommand(page.data.user);
```

Registration runs once per authenticated admin session after klog hydration is kicked off.

### Shared logger helper (future commands)

[`src/lib/devConsole/state.svelte.ts`](../../../src/lib/devConsole/state.svelte.ts) exports `createKlogBroadcaster(source)` with the same interface shape as kickagent’s `KlogBroadcaster`. The hello-world demo uses a local `createDemoLogger` in `registerHelloCommand.ts`; new kickagent commands may prefer `createKlogBroadcaster("kickagent:…")`.

---

## End-to-end flow

1. Admin opens the app; root layout registers `kickagent:hello`.
2. User presses `Ctrl+/`, runs `kickagent:hello` (**`shell kickagent`** then **`hello`** in kickagent shell, or use **`alias kickagent ka`** once for a **`ka`** shortcut).
3. kickagent’s `helloWorld` calls `logger.info(...)` → klog: `hello from kickagent (user=…@…)`.
4. Return value is surfaced as a second klog line: `Hello, …@…!`

---

## Notes

- Keep the command name stable (`kickagent:hello`) even if kickagent internals change.
- Do not import kickagent from server-only routes unless the function is safe for that context; the demo runs client-side via the dev console.
- Sibling repo required for install: `../kickagent` (see [README.md](../../../README.md#development)).
