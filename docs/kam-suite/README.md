# KAM Suite documentation

Product story, architecture pitch, and slides for **KAM Suite** (kickstaff + kickagent). All files in this folder use the **`kam-`** prefix.

**Wiki viewer:** [http://127.0.0.1:7097/wiki/](http://127.0.0.1:7097/wiki/) — sidebar nav, markdown, slide decks. Maintainer docs: **APPENDIX → Wiki** ([overview](../appendix/wiki/README.md), [architecture](../appendix/wiki/architecture.md), [operations](../appendix/wiki/operations.md)). Regenerate sidebar: `pnpm docs:wiki-toc`. **Kickdesk:** **`c`** → **`wiki`** to start (or open the URL if 7097 is already up). **`p`** is republish only, not wiki.

**Discovery collector (local):** [http://127.0.0.1:7096/](http://127.0.0.1:7096/) — Phase A interview form (`pnpm kam:discovery`). See [../discovery/README.md](../discovery/README.md).

| File | Purpose |
| ---- | ------- |
| [kam-suite-vision.md](kam-suite-vision.md) | Product wrapper, Alpha → Beta → service (**read first**) |
| [kam-ecosystem-marketing.md](kam-ecosystem-marketing.md) | The pitch + technical details (two-app integration) |
| [kam-ecosystem-pitch-deck.html](kam-ecosystem-pitch-deck.html) | reveal.js slides for the pitch (open in browser) |

Contributor architecture: [../kickagent/architecture/overview.md](../kickagent/architecture/overview.md). Full docs: [../kickagent/README.md](../kickagent/README.md).
