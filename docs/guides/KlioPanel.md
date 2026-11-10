# Klio panel

Host chrome for Klio, the clerk published by Kickagent. The panel is a full-height column on the right. It is not a `resources.*` page and not a console command.

**Now:** the panel input is `klio:ask` without typing the verb. The console and palette use the namespace: `klio` enters `[Klio] >`, `klio:ask <message>` and `? <message>` run the same ask. The browser posts to `/api/klio`. The host forwards to manifest `klio.devOrigin` + `path` (laptop `http://127.0.0.1:7094/klio`) or the publish origin, asking for `text/event-stream`. Each `delta` grows the reply line. A one-shot JSON `{ reply }` still paints once. No model key in this repo.

**Later:** the host proxies a turn to Kickagent `POST /klio`. This page changes when that route exists.

## Behavior

- `]` toggles the panel when focus is not in a text field. `[` toggles the console. `Ctrl+]` and `Ctrl+[` (or ⌘) do the same while a text field is focused. The account-menu hover control (hint “Klio Agent”) toggles Klio too.
- Closed by default. Open state is not stored.
- Signed-in users on screens that show the internal nav. Public rental pages and the login screen do not mount it.
- Transcript rows are either the user or Klio. Names are not printed; each turn is a colored bubble (user slate, Klio teal). Lines are stored in the **product** database for the signed-in user and the active dataset (`dev` / `staging` / `prod`). Opening the panel reloads that thread. The header **+new** and **chats** buttons sit between the title and **time**, and split the space between them. **+new** closes the thread, starts an empty one, focuses the input, and shows a local “new chat” status (not stored). **chats** replaces the transcript with saved threads (first user line as the label) and saved plans (the plan title, green edge). **del** removes a thread, or takes a saved plan off the list (the audit row stays, cancelled). Choosing a saved plan makes it the pending card again. A proposal shows that card under her reply: title, time, one line per call, and **Confirm**, **Save**, and **Cancel**. Those buttons post the plan id. **Confirm** runs the stored calls and leaves the command logs on the card. **Save** and **Cancel** clear the card. The next ask tells her the pending plan, or that there is none, and the latest executed logs. Both header buttons are disabled while a reply is streaming. The header **time** switch is the same preference as the console (`kickstaff.consoleUi` / `showTimestamps`): off by default, 10px left gutter when off, clock column when on; hover still shows the line time.
