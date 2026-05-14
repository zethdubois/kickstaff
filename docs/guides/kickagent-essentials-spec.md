# Kickagent Essentials Spec

Audience: kickagent repo developer.

Purpose: define the minimum package contract for kickagent as a library-first module that `publicweb` can import and wrap in the KAM console.

## Core decision

kickagent is a library of exported functions, not a server-first service.

- Primary interface: exported functions
- Local test harness: CLI wrapper required
- HTTP harness: optional secondary tool only
- `publicweb` integration: imports kickagent as a package and wraps its functions as console commands

## Required first function

Implement the first function as the package contract:

```ts
export async function helloWorld(
  userId: string,
  userEmail: string,
  logger: KlogBroadcaster,
): Promise<{ message: string }>;
```

## Required logger contract

Define the logger locally in kickagent. Do not import logger types from `publicweb`.

```ts
export interface KlogBroadcaster {
  log(msg: string): void;
  info(msg: string): void;
  warn(msg: string): void;
  error(msg: string): void;
}
```

## helloWorld behavior

- Accept `userId`, `userEmail`, and `logger`
- Emit a real-time log message through `logger.info(...)`
- Return `{ message: string }`
- Do not call `console.log()` inside the function
- Do not depend on browser APIs or `publicweb` internals

Expected behavior:

- log output: `hello from kickagent (user=alice@example.com)`
- return value: `Hello, alice@example.com!`

## Package layout

Suggested structure:

```text
kickagent/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── hello.ts
│   ├── types.ts
│   └── cli.ts
└── README.md
```

## Export surface

The package entry point should export the function and the logger type:

```ts
export { helloWorld } from "./hello.js";
export type { KlogBroadcaster } from "./types.js";
```

## CLI wrapper requirement

kickagent should include a small CLI entry point for manual testing.

Example behavior:

- `kickagent hello --userId user-123 --userEmail alice@example.com`
- prints the returned message
- writes the logger output to stdout/stderr
- exits with a non-zero code on failure

The CLI is the recommended standalone test path.

## HTTP harness

An HTTP server is optional and secondary.

If present, it must be treated as a dev harness only, not the primary contract.
Do not make `publicweb` depend on the HTTP server for normal integration.

## Build expectations

- package must build cleanly to `dist/`
- ESM output should use `.js` extensions in relative imports
- `dist/index.js` and `dist/index.d.ts` must exist for package consumption
- `publicweb` should be able to import the package directly as a dependency

## publicweb integration contract

`publicweb` will:

- import `helloWorld` from `kickagent`
- provide a concrete `KlogBroadcaster`
- register a console command named `kickagent:hello`
- pass the current user context to the kickagent function
- surface the returned message back into the KAM console

`publicweb` should not need to know kickagent internals.

## Acceptance criteria

The spec is complete when:

- `helloWorld(userId, userEmail, logger)` exists and is exported
- logger methods are used for progress output
- a CLI wrapper exists and works locally
- package builds successfully
- `publicweb` can import the package and run the hello command
- no HTTP server is required for the core integration path
