# Kickagent: Hello World Milestone

**Audience:** Developer implementing `kickagent.git`.

**Canonical contract:** [kickagent-essentials-spec.md](kickagent-essentials-spec.md) — function signature, logger rules, CLI, build, and acceptance criteria. This doc is a **first-milestone walkthrough** only (scaffolding and local verification).

**publicweb side:** [publicweb-hello-world.md](publicweb-hello-world.md).

---

## Goal

Ship the first exported function so publicweb can import the package and run `kickagent:hello` in the KAM console (`Ctrl+/`). Behavior and types are defined in the essentials spec; do not duplicate them here.

---

## Suggested package layout

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

## `package.json` (minimal)

```json
{
  "name": "kickagent",
  "version": "0.0.1",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

## `tsconfig.json` (minimal)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

## Exports

`src/index.ts`:

```ts
export { helloWorld } from "./hello.js";
export type { KlogBroadcaster } from "./types.js";
```

Implement `helloWorld` and `KlogBroadcaster` per the essentials spec (`src/hello.ts`, `src/types.ts`).

---

## Local verification

### CLI (preferred)

Per essentials: e.g. `kickagent hello --userId user-123 --userEmail alice@example.com` — prints the return value and routes logger output to stdout/stderr.

### Mock logger script (optional)

```typescript
import { helloWorld } from "./dist/hello.js";

const mockLogger = {
  log: (msg: string) => console.log("[log]", msg),
  info: (msg: string) => console.log("[info]", msg),
  warn: (msg: string) => console.warn("[warn]", msg),
  error: (msg: string) => console.error("[error]", msg),
};

const result = await helloWorld("user-123", "alice@example.com", mockLogger);
console.assert(result.message === "Hello, alice@example.com!");
```

---

## Build and link to publicweb

```bash
npm run build
```

publicweb depends on the sibling checkout:

```json
{
  "dependencies": {
    "kickagent": "file:../kickagent"
  }
}
```

After kickagent builds, run `pnpm install` in publicweb if needed, then test end-to-end: sign in as admin, **`shell kickagent`** (or **`alias kickagent ka`** then **`ka`**), **`hello`** or **`kickagent:hello`**.

---

## What publicweb does (summary)

publicweb imports `helloWorld`, registers `kickagent:hello`, passes `user.id` / `user.email`, and surfaces the returned message in klog. Details: [publicweb-hello-world.md](publicweb-hello-world.md).

---

## Milestone checklist

- [ ] `helloWorld` + `KlogBroadcaster` match [kickagent-essentials-spec.md](kickagent-essentials-spec.md)
- [ ] CLI works locally
- [ ] `dist/index.js` and `dist/index.d.ts` exist after `npm run build`
- [ ] publicweb runs `kickagent:hello` successfully
