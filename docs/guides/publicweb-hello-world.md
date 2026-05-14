# publicweb — Kickagent Hello World Integration

Purpose: define how `publicweb` consumes the first `kickagent` function and exposes it in the KAM console.

Current demo shape

- `publicweb` owns the wrapper layer and console registration.
- `kickagent` owns the pure function contract: `helloWorld(userId, userEmail, logger)`.
- `publicweb` provides the concrete `KlogBroadcaster` implementation.
- `publicweb` now imports `helloWorld` from the installed `kickagent` package.

What gets wired

- Console command name: `kickagent:hello`
- User context: `page.data.user` from `publicweb`
- Logger: `KlogBroadcaster` shim backed by `klogWithSource`
- Result handling: surface the returned message back into the console as a klog line

Example flow

```ts
registerKickagentHelloCommand(page.data.user);

// when user runs: kickagent:hello
// publicweb imports helloWorld from the kickagent package and calls it
// console shows:
//   hello from kickagent (user=user@example.com)
//   Hello, user@example.com!
```

Notes

- The wrapper remains thin so it can keep using the same command shape as `kickagent` evolves.
- The shared contract is the function signature and logger interface, not the implementation details.
- Keep the console command name stable (`kickagent:hello`) even if the function internals change.
