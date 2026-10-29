# Platform overview (kickstaff + kickagent)

**Audience:** Developers and agents working across **kickstaff** and the sibling **kickagent** repo.

**Purpose:** One mental model for product boundaries, Postgres ownership, storage, and UI surfaces (KAM vs KAM-UI). For host/plugin wiring details, see [contracts/kickstaff-kickagent-consumer.md](contracts/kickstaff-kickagent-consumer.md) and [kam-console.md](kam-console.md).

---

## Roles

**kickstaff** is the authenticated web product: production rental marketing pages, team hub, admin for rental configuration, and the **KAM host** (command palette, console, klog, manifest load). Future **KAM-UI** dashboards will be the primary office control surface in this repo.

**kickagent** is the headless operations engine: bill/unit domain logic, ETL, CLI, plugin commands (`kickagent:*`), and (planned) HTTP job API. It can be consumed by kickstaff or, in principle, other frontends via the same API boundary.

kickstaff does **not** own long-term business logic for utility bills, units, or back-office batch work; kickagent does.

---

## Architecture

```mermaid
flowchart TB
  subgraph kickstaff [kickstaff product]
    Rental[Rental pages and admin]
    Hub[Dashboard links]
    KAM[KAM CLI console]
    KAMUI[KAM-UI dashboards planned]
    PWAuth[Auth sessions]
  end

  subgraph kickagent [kickagent operations]
    Plugin[Plugin commands manifest]
    API[HTTP API jobs planned]
    OpsLogic[Bills units ETL logic]
  end

  subgraph storage [Storage]
    PG[(Postgres one instance)]
    PWSchema[product database]
    OpSchema[ops database]
    S3[S3 PDFs CSV]
    RedisFuture[Redis optional future]
  end

  kickstaff -->|admin session proxy| kickagent
  KAM --> Plugin
  KAMUI -->|future| API
  Rental --> PWSchema
  Hub --> PWSchema
  PWAuth --> PWSchema
  KAM --> PWSchema
  OpsLogic --> OpSchema
  OpsLogic --> S3
  RedisFuture -.->|future queue stream| kickagent
  PG --> PWSchema
  PG --> OpSchema
```

---

## Postgres: one instance, two databases

One Postgres **process** per environment (laptop container on port 5043, or that Railway Postgres). Two **databases**, two URLs. The path is the database name. This is not two schemas inside one database, and not two containers.

| Database | Laptop URL path | Staging / prod path | Owner |
| --- | --- | --- | --- |
| Product | `/kickstaff_dev` via `DATABASE_URL_DEV` | `/…` via that service's `DATABASE_URL` | kickstaff: users, sessions, dataset rows ([schema.ts](../../src/lib/server/schema.ts)) |
| Ops | `/kickagent_ops_dev` | `/kickagent_ops` | kickagent commands (`sites`, `gl`, units) |

Host contract: sibling `../kickagent/docs/kickagent/architecture/frontend-guide.md`. Dataset rows live in the product database and hold the ops URL. Until that form ships, Kickstaff rewrites the product URL's path before spawning a command (`opsConnectionString`).

`rental_landing_links` stays in the product database and must not be broken by migrations. Legacy ops tables were dropped from the product database (migration `0019`). Reference users from ops by id only; no foreign key across databases.

---

## Storage

| Layer | Technology | Role |
|-------|------------|------|
| **Kickagent** | Postgres database `kickagent_ops` / `kickagent_ops_dev` | System of record for units, bills, runs, audit |
| **Kickagent** | S3-compatible object store | PDF intake, parse snapshots, Appfolio CSV outputs — see [upgrade/utility-bill-etl-scope.md](../upgrade/utility-bill-etl-scope.md) |
| **Kickagent** | Redis (optional, future) | Queue, coordination, or integration with an existing third-party Redis data ecosystem — **not in scope for initial schema work**; document only |
| **Kickstaff** | Postgres product database | Users, rental config, dashboard links, klogs, future KAM-UI prefs — modest volume |

Env: `DATABASE_URL_DEV` (laptop) and `DATABASE_URL` (this deploy) are the **product** database only. Kickagent commands use the other database on that instance.

S3 and bill pipeline env live in **kickagent** deploy config, not kickstaff [`.env.example`](../../.env.example).

---

## Product surfaces

| Surface | What it is | Status |
|---------|------------|--------|
| **KAM** | CLI: command palette (`Ctrl+/`), KAM Console pane, `kickagent:*` commands, manifest reload (`load kickagent`), klog | Implemented — [kam-console.md](kam-console.md) |
| **KAM-UI** | Configurable dashboards for the same kickagent capabilities (control + feedback) | **v0 on hub** — URL link cards + lazy materialized `kickagent:*` command cards ([kickagent consumer guide](contracts/kickstaff-kickagent-consumer.md)); richer widgets planned |
| **`/tools/*`** | *(removed)* | Replaced by kickagent + KAM-UI; behavior captured in [upgrade primers](../upgrade/README.md) |

KAM and KAM-UI share one **engine** (kickagent commands / API); they differ only in **presentation** (terminal vs dashboards).

---

## Production vs incubating

| Area | Production? | Rule |
|------|-------------|------|
| Rental pages (`/cda`, `/mos`, `/spt`, vanity hosts) | **Yes** | Do not remove or break routes or `rental_landing_links` data |
| Admin rental configuration (`/admin/rental-links`, etc.) | **Yes** | May reorganize in nav; must remain functional |
| Auth (`users`, `sessions`) | **Yes** | Required for admin access |
| Hub dashboard (links + command cards) | Incubating / internal | `dashboard_links` + lazy materialize on first command run |
| KAM console | Incubating | Active development |
| `/tools/*` | **Removed** | See [docs/upgrade/](../upgrade/README.md) for handoff to kickagent |
| Bills / units / reports logic | **Removed from kickstaff** | Rebuild in kickagent + KAM-UI |

---

## Phased roadmap (not commitments)

1. **Documentation** (this guide) — shared boundaries.
2. **Operations schema in kickagent** — Drizzle `pgSchema('operations')`; new tables/migrations owned by kickagent (kickstaff dropped legacy ops tables).
3. **kickagent API (Phase 3)** — server-side jobs; kickstaff `/api/kickagent/*` proxy; SSE → klog.
4. **KAM-UI v0** — e.g. document queue + job status widgets calling the same API as CLI commands.
5. **Retire `/tools`** — done in kickstaff; implement parity in kickagent + KAM-UI.

---

## Related docs

| Doc | Topic |
|-----|--------|
| [contracts/kickstaff-kickagent-consumer.md](contracts/kickstaff-kickagent-consumer.md) | Host/subscriber phases, security, commands |
| [contracts/README.md](contracts/README.md) | Cross-repo contract index |
| [kam-console.md](kam-console.md) | KAM UX, aliases, kickagent mode |
| [../upgrade/utility-bill-etl-scope.md](../upgrade/utility-bill-etl-scope.md) | Bills pipeline scope (KA reference) |
| [../upgrade/README.md](../upgrade/README.md) | Handoff primers (bills, units, reports) after `/tools` removal |
| [production-operations.md](production-operations.md) | Operators: vanity, rental links |
| [kickagent/docs/kickstaff-integration.md](../../../kickagent/docs/kickstaff-integration.md) | Kickagent-side entry for kickstaff devs |
| [kickagent/docs/platform-overview.md](../../../kickagent/docs/platform-overview.md) | Kickagent-focused summary (same architecture) |
