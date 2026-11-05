# Klio panel

Host chrome for Klio, the clerk published by Kickagent. The panel is a full-height column on the right. It is not a `resources.*` page and not a console command.

**Now:** the panel input is `klio:ask` without typing the verb. The console and palette use the namespace: `klio` enters `[Klio] >`, `klio:ask <message>` and `? <message>` run the same ask. The reply stays in the browser (`Klio is not connected yet.`) until the host proxies `/klio`. No model key.

**Later:** the host proxies a turn to Kickagent `POST /klio`. This page changes when that route exists.

## Behavior

- `]` toggles the panel when focus is not in a text field. `[` toggles the console. `Ctrl+]` and `Ctrl+[` (or ⌘) do the same while a text field is focused. The account-menu hover control (hint “Klio Agent”) toggles Klio too.
- Closed by default. Open state is not stored.
- Signed-in users on screens that show the internal nav. Public rental pages and the login screen do not mount it.
- Transcript rows are either the user or Klio.
