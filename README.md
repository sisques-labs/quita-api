# Quita API

Backend for **Quita**, an expense-sharing app for couples in the style of
Splitwise: groups of two, shared expenses, payments (settlements) and a
"who owes whom" balance. Built with **DDD + CQRS + Hexagonal** architecture,
TypeORM/PostgreSQL, optional Kafka event forwarding, a **GraphQL-only** (Apollo)
business API (REST is limited to health checks and Swagger), structured logging
(`@sisques-labs/nestjs-kit` + Winston), OpenTelemetry traces + metrics + logs, an MCP
endpoint, health checks, and the Sisques Labs CI/CD workflows.

Bootstrapped from the Sisques Labs `nestjs-template`. Bounded contexts live
under `src/contexts/`; the cross-cutting infrastructure is in `src/core/` and
`src/support/` (see the `architecture` skill in
`.claude/skills/architecture/SKILL.md`).

## Bounded contexts

Each context has its own README with the current domain, messages and ports.

| Context | Responsibility |
|---------|----------------|
| [`groups`](src/contexts/groups/README.md) | Group lifecycle (name, creator); creating a group makes its creator the owner member |
| [`group-members`](src/contexts/group-members/README.md) | Leaf context: the roster of each group, the member limit and membership checks |
| [`group-invitation-codes`](src/contexts/group-invitation-codes/README.md) | Reusable, non-expiring codes to join a group; regenerating a code invalidates the previous one |
| [`expenses`](src/contexts/expenses/README.md) | Shared expenses (integer euro cents): create, edit, soft delete and a filterable history |
| [`payments`](src/contexts/payments/README.md) | Settlements between the two members: create, edit, soft delete and a filterable history |
| [`balances`](src/contexts/balances/README.md) | Read-only "who owes whom", computed on every read from active expenses and payments (owns no tables) |

Contexts never import each other. A consumer defines the port it needs in its
own `application/ports/` and implements it with a bus adapter in its
`infrastructure/adapters/` (the only place allowed to import another context),
which talks to the other context's public commands and queries through the
CQRS buses. `group-members` is the leaf: it has no outgoing ports.

The transport is GraphQL only. Every resolver is protected by the Clerk guard
and takes the requester from the verified token (`@AuthUser()`), never from
the input.

The org standard is trunk-based development: `main` is the only long-lived
branch. Every merge to `main` triggers `trunk-ci-cd.yml` (build +
`dev`/`pre` deploy); cutting a `prod` release is a separate, manual step via
`release.yml`. See `sisques-labs/workflows`' README for the full model.

## Getting started

1. Copy `.env.example` to `.env` and fill in real values.
2. `pnpm install`
3. `docker compose up -d postgres` to start the dev Postgres (port 5434), run
   `pnpm migration:run`, then `pnpm dev`.
4. New bounded contexts go under `src/contexts/`; register each module in
   `CONTEXT_MODULES` in `src/contexts/contexts.module.ts`.

## What's included

| Area | Where | Notes |
|------|-------|-------|
| Config + env validation | `src/core/config/` | Zod-validated env vars, CORS origin resolution |
| Health checks | `src/core/health/` | `GET /api/health/live` (liveness), `GET /api/health/ready` (DB ping via `@nestjs/terminus`) |
| Logging | `src/support/logging/` | Winston via `@sisques-labs/nestjs-kit`, JSON file + console transports, plus an OTel transport forwarding to the pipeline below |
| Kafka event forwarding | `@sisques-labs/nestjs-kit/messaging` (wired in `src/core/core.module.ts`); `src/core/messaging/` keeps only the app-local, auto-generated aggregate→topic map | Opt-in (`KAFKA_ENABLED`), no-op when disabled |
| OpenTelemetry | `src/telemetry.ts` (bootstrap), `src/core/observability/` (CQRS spans+metrics) | Traces + metrics + logs exported via OTLP to a collector; all disabled together until `OTEL_EXPORTER_OTLP_ENDPOINT` is set. Auto-instruments HTTP/Express, GraphQL, Postgres, Kafka; CQRS command/query buses get spans + duration/count metrics; every Winston log line is forwarded too (`@opentelemetry/winston-transport`), correlated with the active span. `docker-compose.yml` ships a local collector + Jaeger UI (`:16686`) + Prometheus UI (`:9090`) — logs currently just land in the collector's own output (no local log backend wired up yet; swap the `logs` exporter in `docker/otel-collector-config.yaml` for Loki or similar when ready) |
| Auth (Clerk) | `src/core/auth/infrastructure/clerk/` (`ClerkAuthGuard`, `@AuthUser()`), config in `src/core/config/clerk.config.ts` | Verifies Clerk session JWTs (RS256, public keys from the JWKS URL, issuer check, optional `azp` allow-list). Fail-closed: until `CLERK_JWKS_URL` and `CLERK_ISSUER` are set the guard rejects every request. Verification only, it never signs tokens. The template's `AuthClientModule` (Sisques Account, `AUTH_ENABLED`/`AUTH_JWT_SECRET`) is still wired in `src/core/core.module.ts` but no route uses it |
| Clock | `src/core/clock/` | `CLOCK` token returning "today" (`YYYY-MM-DD`) in a fixed time zone (`APP_TIMEZONE`, default `Europe/Madrid`); expenses and payments use it for the no-future-dates rule |
| MCP (Model Context Protocol) | `@sisques-labs/nestjs-kit/mcp` (wired in `src/core/core.module.ts`) | `POST /api/mcp`, per-request server, tool auto-discovery |
| GraphQL (+ REST for ops) | `src/main.ts`, `src/core/core.module.ts` | Apollo GraphQL at `/graphql` carries the whole business API; REST only serves health checks, with Swagger at `/docs` |
| Database | `src/database/`, TypeORM | Postgres only; migrations in `src/database/migrations/` |
| CI/CD | `.github/workflows/` | `ci.yml` (lint+test+build+e2e+integration), `docker.yml` (PR smoke build), `trunk-ci-cd.yml` (continuous build + dev/pre deploy on push to `main`), `release.yml` (manual promote to prod), `image-cleanup.yml` (weekly ephemeral tag retention) — all via `sisques-labs/workflows` |
| Dev workflow | `AGENTS.md`, `.claude/`, `openspec/` | Architecture skill, OpenSpec propose/apply/archive skills, project conventions in `openspec/config.yaml` |

## Deliberately not included

These are common enough that they shouldn't be baked into every service, but
specific enough that they'd bias the service toward one shape:

- **Tenant-scoped authorization** (what each role is allowed to do inside
  *your* domain) — `@sisques-labs/nestjs-kit/rbac`'s `createTenantPermissionGuard()`
  gives you the mechanism, but your own permission enum and
  role→permission map are always bring-your-own per bounded context (see
  the `architecture` skill's `infrastructure/guards/{name}.guard.ts`
  convention). Verifying *who* the caller is (Clerk's JWT) is
  already wired — see "What's included" above; what they can do (group
  membership checks) is enforced per context. The MCP module's `contextBuilder` option (see
  `McpModule.forRoot(...)` in `src/core/core.module.ts`, and `IMcpContextBuilder`
  from `@sisques-labs/nestjs-kit/mcp`) and `src/core/filters/base-exception.filter.ts`
  both have a documented extension point for when a context needs identity
  inside an MCP tool or a custom error shape.
- **MongoDB** — `@sisques-labs/nestjs-kit/mongodb` is available if a service
  needs it alongside or instead of Postgres.

## Local development

```bash
pnpm install
docker compose up -d postgres   # dev Postgres on localhost:5434 — see docker-compose.yml
pnpm migration:run
pnpm dev                        # nest start --watch
```

| Script | Description |
|--------|-------------|
| `pnpm dev` / `pnpm debug` / `pnpm prod` | Run the app (watch / debug / prod) |
| `pnpm lint` | ESLint with `--fix` |
| `pnpm test` | Unit tests (Vitest, co-located `src/**/*.spec.ts`) |
| `pnpm test:cov` | Unit tests with coverage |
| `pnpm test:db:up` / `pnpm test:db:down` | Start/stop the test Postgres (`docker-compose.test.yml`, port 5433) |
| `pnpm test:integration` | Integration tests (`test/integration/**/*.integration-spec.ts`, persistence boundaries); needs `test:db:up` |
| `pnpm test:e2e` | E2E tests (`test/**/*.e2e-spec.ts`, full `AppModule`, GraphQL); needs `test:db:up` |
| `pnpm migration:generate` / `:run` / `:revert` | TypeORM migrations (in `src/database/migrations/`) |
| `pnpm gen:topics` / `pnpm gen:topics:check` | Regenerate/verify the Kafka aggregate→topic map (`src/core/messaging/`) |

Husky runs `pnpm gen:topics` + `lint-staged` on **pre-commit**, and
`pnpm build && pnpm test:changed` on **pre-push**.

## Environment variables

Copy `.env.example` to `.env`. The Zod schema in
`src/core/config/env.validation.ts` is the source of truth for every variable
(required ones, enums, cross-field rules); the app refuses to boot on invalid
values. The variables below are the ones the Quita MVP introduced:

| Name | Required | Default | Description |
|------|----------|---------|-------------|
| `APP_TIMEZONE` | Optional | `Europe/Madrid` | IANA time zone (validated at boot) used by the `CLOCK` to decide what "today" is for the no-future-dates rule on expenses and payments |
| `CLERK_JWKS_URL` | Optional (see note) | unset | URL of the Clerk JWKS endpoint used to verify RS256 tokens; must be a valid URL when set |
| `CLERK_ISSUER` | Optional (see note) | unset | Expected `iss` claim of the Clerk tokens; must not be empty when set |
| `CLERK_AUTHORIZED_PARTIES` | Optional | empty | Comma-separated allow-list for the `azp` claim. It is only checked when the token carries an `azp`; a validly signed token without one is accepted |

Note: Clerk variables are optional so the service can boot without them, but
the guard is fail-closed: until both `CLERK_JWKS_URL` and `CLERK_ISSUER` are
set it rejects every request as unauthenticated, so set both in any real
environment.

## Architecture

DDD + CQRS + Hexagonal (Screaming Architecture). Full rules, file naming, and
the mandatory find-by-criteria filter pattern live in
`.claude/skills/architecture/SKILL.md`; project-wide conventions (tech stack,
testing layers, apply-time rules) live in `openspec/config.yaml`.
