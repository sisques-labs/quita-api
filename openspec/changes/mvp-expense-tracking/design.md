# Design: MVP Expense Tracking

## Technical Approach

Six bounded contexts under `src/contexts/`, each following the architecture skill (domain/application/infrastructure/transport). Cross-context calls use a consumer-owned port in `application/ports/` plus an adapter in `infrastructure/adapters/` that dispatches the provider context's Query/Command via the bus (enforced by `boundaries/element-types` in `.eslintrc.js`). The dependency graph is acyclic, and `group-members` is the leaf:

```
groups ───────────────┐
group-invitation-codes ┤
expenses ─────────────┼──> group-members
payments ─────────────┤
balances ─────────────┘──> expenses, payments
```

## Architecture Decisions

| # | Question | Options | Tradeoff | Decision |
|---|---|---|---|---|
| 1 | members <-> codes cycle | A) members owns join, calls codes. B) codes owns redeem, calls members | A needs codes -> members for "caller is member", which creates a cycle. B has one-way deps | **B**: `RedeemInvitationCodeCommand` lives in `group-invitation-codes` and calls the members port `addMember`. `group-members` has no outbound ports |
| 2 | Creator auto-membership | A) `GroupCreatedEvent` -> adapter in members. B) sync port call from `CreateGroupHandler` | A is eventual, so the client may read a group before membership exists, and failures are silent. B gives read-your-writes, and stays acyclic only if members does not depend on groups | **B**: groups -> members `createMembership(groupId, ownerId)`. We drop the proposal's members -> groups "exists" port, because the callers (groups, codes) already guarantee the group exists. On port failure the handler dispatches `DeleteGroupCommand`, which deletes the group and calls `deleteMemberships(groupId)` (backed by the idempotent `DeleteGroupMembershipCommand` in members, so cleanup is safe even if the roster was never created), then rethrows. `DeleteGroupHandler` hard-deletes the group first, then runs `deleteMemberships` best-effort: up to 3 attempts in total with a 50 ms fixed delay, one warn per retry and a single error log (with attempt count and group id) after the last failure; it never rethrows, still publishes `GroupDeletedEvent` and returns the id. If every attempt fails an orphan roster may remain: harmless today (`GroupsFindOwnHandler` resolves groups through `findByIds`, and the other handlers assert the group first) and there is no automatic reconciliation. `DeleteGroupCommand` is INTERNAL ONLY (compensation, no `requesterId`, hard delete); exposing it needs a guard plus requester check, a soft-delete decision and cleanup of invitation codes, expenses and payments (invitation-code redeem does not check group existence). **Deferred**: a Kafka inbound consumer reacting to `GroupDeletedEvent` for the cleanup. Kafka is opt-in (`KAFKA_ENABLED=false` by default, no broker in dev/test, best-effort forwarding, no outbox) and the boundaries ESLint rule forbids an in-process cross-context event handler, so it is only worth doing once Kafka is mandatory |
| 3 | Member limit | A) per-member aggregate + count check. B) `GroupMembershipAggregate` roster with capacity | A races on concurrent joins. B enforces the invariant in one aggregate with optimistic `version` | **B**: `GroupMembershipAggregate.addMember()` throws `GroupMembershipFullException`. `capacity` is a column (default 2) in a VO, so going to N is a data change |
| 4 | Auth | A) reuse kit `AuthClientModule` (HS256 secret). B) new core `ClerkAuthModule`: `jose` `createRemoteJWKSet` + `jwtVerify` (RS256, issuer, optional `azp`) | A cannot verify Clerk RS256 tokens | **B** in `src/core/auth/infrastructure/clerk/`. `ClerkAuthGuard` (GraphQL context) and `@AuthUser()` return `{ userId }`. The kit module stays wired and unused (`AUTH_ENABLED` unset). A `USER_ID_RESOLVER` token maps `sub` to the internal id. v1 is identity (the opaque string `sub`, `varchar(64)`), so a later Sisques Account switch replaces the resolver plus a data remap |
| 5 | Transport | GraphQL / REST / both | Both doubles the transport code and the PR size. GraphQL matches the mandatory Criteria pattern | **GraphQL only** (confirmed). REST is out of scope and can be added later with no domain change. No MCP tools yet |
| 6 | Money | float / decimal / int cents | Floats lose precision | `integer` cents, `CHECK > 0`. Each context has its own `AmountValueObject` (no shared kernel). Currency is fixed to `EUR` (`char(3)`) |
| 7 | Edit/delete | in-place + `updatedAt` / revision table | Revisions are outside the MVP scope | In-place update, `deletedAt` soft delete. Mutating a deleted record throws `*AlreadyDeletedException` |
| 8 | Isolation | guard per context / handler check | Transport-only checks are easy to bypass | Every group-scoped command/query carries `groupId` plus `requesterId` (from the guard, never from input). The handler calls `AssertRequesterIsGroupMemberService` (port), and read repos always filter by `group_id` |
| 9 | Cross-context FKs | FK / none | FKs couple the schemas | FKs only inside a context |
| 10 | Edit/delete authorization | owner-only / any member | Owner-only adds friction for couples | **Any member** may edit or soft-delete any expense/payment of the group. No owner check; the membership port check (#8) still applies. `updatedBy` records the editor |
| 11 | Invitation code lifetime | single-use / expiring / reusable | Single-use and expiry add state and UX friction | **Reusable, no expiry**. One active code per group: partial UNIQUE index `(group_id) WHERE revoked_at IS NULL`. `RegenerateInvitationCodeCommand` revokes the active code and inserts a new one in one transaction. Revoked or unknown codes throw `InvitationCodeInvalidException` |
| 12 | Category | free text / fixed enum | Free text fragments future category views | **Optional fixed enum** `ExpenseCategory` (see Interfaces). Domain enum is the single source of truth; DB column `varchar(16)` + `CHECK` |
| 13 | History | per-context list / unified timeline / balance snapshots | A unified cross-context timeline needs merge-pagination over two sources; snapshots are out of scope | **Per-context `FindByCriteria` queries** that include soft-deleted rows (flagged by `deletedAt`), default ordered by date desc. No balance-over-time |
| 14 | EQUAL odd cent | round half / payer absorbs / alternate | Only payer-absorbs is deterministic and keeps `sum(net)==0` trivially | **Payer absorbs**: the other member owes `floor(A/2)` |
| 15 | Future dates | allow / reject | Future entries distort the current balance | **Reject** on create AND edit: `spentOn`/`paidOn` MUST be `<= today`, else `ExpenseDateInFutureException` / `PaymentDateInFutureException` |
| 16 | Definition of "today" | UTC / per-request client tz / fixed configured tz | UTC rejects valid Madrid dates between 00:00 and 01:00/02:00 local; per-request tz is spoofable and complex | **Fixed IANA timezone from config** `APP_TIMEZONE` (default `Europe/Madrid`), read once at boot, not per request |

## Ports (consumer-owned)

| Consumer | Port method | Provider bus message (group-members unless noted) |
|---|---|---|
| groups | `createMembership(groupId, ownerId)` | `CreateGroupMembershipCommand` |
| groups | `listGroupIdsForUser(userId)`, `isMember` | `GroupMembershipFindGroupIdsByUserQuery`, `GroupMemberIsMemberQuery` |
| group-invitation-codes | `isMember`, `addMember(groupId, userId)` | `GroupMemberIsMemberQuery`, `AddGroupMemberCommand` |
| expenses, payments | `isMember`, `listMemberIds(groupId)` | `GroupMemberIsMemberQuery`, `GroupMembersFindByGroupIdQuery` |
| balances | `isMember`, `listMemberIds` | same as above |
| balances | `listActiveExpenses(groupId)` | expenses `ExpensesFindActiveByGroupQuery` |
| balances | `listActivePayments(groupId)` | payments `PaymentsFindActiveByGroupQuery` |

## Aggregates and Tables

Aggregate classes MUST be exported as `*Aggregate` from `domain/aggregates/*.aggregate.ts` with globally unique names (required by the topic-map generator).

| Context | Aggregate | Table(s) |
|---|---|---|
| groups | `GroupAggregate` (id, name, createdBy, timestamps) | `groups` |
| group-members | `GroupMembershipAggregate` (groupId, capacity, version, members[userId, role OWNER\|MEMBER, joinedAt]) | `group_memberships` (PK group_id), `group_members` UNIQUE(group_id, user_id) |
| group-invitation-codes | `GroupInvitationCodeAggregate` (id, groupId, code, createdBy, revokedAt) | `group_invitation_codes` UNIQUE(code), partial UNIQUE(group_id) where active, 8 chars, Crockford base32 |
| expenses | `ExpenseAggregate` (id, groupId, amountCents, currency, paidBy, spentOn, description?, category?, splitType EQUAL\|OTHER_OWES_ALL, createdBy, updatedBy, timestamps, deletedAt) | `expenses`, index (group_id, deleted_at) |
| payments | `PaymentAggregate` (id, groupId, fromUserId, toUserId, amountCents, paidOn, note?, createdBy, updatedBy, timestamps, deletedAt) | `payments` |
| balances | none (`GroupBalanceViewModel`) | none |

Validation: the payer, `from` and `to` must be members, and `from != to`. Creating an expense requires the group to have at least 2 members (`GroupNotReadyException`).

## Date Rule (not in the future)

- **Storage**: `spent_on` / `paid_on` are Postgres `date` columns; in the domain they are date-only `YYYY-MM-DD` strings (lexicographic compare is correct).
- **Clock (core)**: `src/core/clock/domain/clock.port.ts` defines `ClockPort { today(): string }` under the `CLOCK` token. `src/core/clock/infrastructure/system-clock.ts` implements it with `Intl.DateTimeFormat('en-CA', { timeZone })` over an injectable `now: () => Date`; `ClockModule` (global, imported by `core.module.ts`) builds it from `appConfig.timezone`.
- **Config**: `APP_TIMEZONE` in `env.validation.ts` (zod, optional, refined as a valid IANA zone via `Intl.DateTimeFormat`), exposed as `timezone` in `app.config.ts` with default `Europe/Madrid`.
- **Domain**: each context owns a date VO (`ExpenseDateValueObject`, `PaymentDateValueObject`) with `create(value, today)` that validates the format and throws `*DateInFutureException` when `value > today`. Aggregates stay pure: create/update handlers inject `CLOCK` and pass `clock.today()` into the aggregate factory and `update()` method, so the rule applies on create AND edit.

**Topic map finding**: `AGGREGATE_MODULE_MAP` is generated by `scripts/generate-aggregate-module-map.ts` (`pnpm gen:topics`, run by the Husky pre-commit hook and verified in CI plus `aggregate-module.map.generated.spec.ts`). It needs five new entries, but they MUST NOT be hand-edited; each slice regenerates and commits the file.

## History Queries (Criteria pattern)

Confirmed order: date DESC, then `createdAt` DESC. `ExpensesFindByCriteriaQuery` / `PaymentsFindByCriteriaQuery` with `groupId` and `requesterId` as required top-level args (the handler injects `group_id` into the repo query; it is never a client filter). Deleted rows are included, exposed as `deletedAt`.

| Context | `{Name}QueryableField` whitelist | Default sort |
|---|---|---|
| expenses | `id, paidBy, spentOn, amountCents, category (enum), splitType (enum), createdAt, deletedAt` | `spentOn DESC, createdAt DESC` |
| payments | `id, fromUserId, toUserId, paidOn, amountCents, createdAt, deletedAt` | `paidOn DESC, createdAt DESC` |

Each follows all six skill steps: queryable-field enum, filterable-fields registry (+spec; enum columns use `{ type: 'enum', enum: ExpenseCategory }`), `createFilterInput`/`createSortInput` inputs, typed request DTO, `FilterValidationPipe`, and a read repo translating all 8 `FilterOperator`s.

## Enum Registration

`src/core/transport/graphql/registered-enums.graphql.ts` registers only shared kit enums (`FilterOperator`, `SortDirection`) and is side-effect imported by `core.module.ts`. Core must not know contexts, so per the skill each context owns `transport/graphql/enums/{name}-registered-enums.graphql.ts`, side-effect imported by its module:
- expenses: `ExpenseCategory`, `ExpenseSplitType`, `ExpenseQueryableFieldEnum`
- payments: `PaymentQueryableFieldEnum`
- group-members: `GroupMemberRole`

## Balance Algorithm (on read)

```
net[u] = 0 for u in members          // positive = is owed
for e in activeExpenses:
  EQUAL:          share = floor(A / n); each non-payer: net -= share; payer: net += share*(n-1)
                  (the payer absorbs remainder cents; n=2 -> other owes floor(A/2))
  OTHER_OWES_ALL: (n == 2) other: net -= A; payer: net += A
for p in activePayments: net[from] += P; net[to] -= P
debts = pair negative with positive nets -> [{fromUserId, toUserId, amountCents}]
```

Property tests: `sum(net) == 0`, and for a single EQUAL expense the non-payer owes exactly `floor(A/2)`.

## Data Flow: Join by Code

```
Resolver -> CommandBus(RedeemInvitationCode{code, requesterId})
  codes handler: find active (revoked_at IS NULL) code -> groupId
    -> MembershipPort.addMember ──adapter──> CommandBus(AddGroupMember)
         members: load GroupMembershipAggregate(version) -> addMember() [capacity/duplicate check] -> save (optimistic lock)
  <- groupId
```

Create group: `CreateGroupHandler` saves the group, then calls `createMembership`. On failure it deletes the group and rethrows.

## Interfaces / Contracts

```ts
export enum ExpenseCategory {
  FOOD = 'food', HOME = 'home', TRANSPORT = 'transport', LEISURE = 'leisure',
  HEALTH = 'health', TRAVEL = 'travel', SHOPPING = 'shopping', BILLS = 'bills', OTHER = 'other',
}
```

## File Changes

| Path | Action |
|---|---|
| `src/core/auth/infrastructure/clerk/{clerk-auth.module,clerk-auth.guard,auth-user.decorator,user-id-resolver}.ts` (+specs) | Create |
| `src/core/config/clerk.config.ts`, `env.validation.ts` (`CLERK_JWKS_URL`, `CLERK_ISSUER`, `CLERK_AUTHORIZED_PARTIES?`) | Create/Modify |
| `src/core/core.module.ts` | Modify: import `ClerkAuthModule`, `ClockModule` |
| `src/core/clock/{domain/clock.port,infrastructure/system-clock,clock.module}.ts` (+specs) | Create |
| `src/core/config/app.config.ts`, `env.validation.ts` (`APP_TIMEZONE`, default `Europe/Madrid`) (+specs) | Modify |
| `src/contexts/{six contexts}/**` + `README.md` each (incl. per-context `*-registered-enums.graphql.ts`) | Create |
| `src/contexts/contexts.module.ts` | Modify: `CONTEXT_MODULES` |
| `src/core/messaging/domain/topics/aggregate-module.map.generated.ts` | Regenerate via `pnpm gen:topics` (no hand edit) |
| `src/database/migrations/*` (one per context) | Create |
| `test/helpers/integration-bootstrap.ts`, `app-bootstrap.ts` | Modify (they already exist): Clerk test signer via a local JWKS |
| `package.json` | Add `jose` |

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit | Aggregates, VOs (incl. category), handlers, balance calculator, guard, filterable-fields registries | Vitest `Mocked<T>`, ports mocked |
| Integration | TypeORM repos (filters, deleted rows, active-code index), optimistic lock, adapters over real buses | Real Postgres, slim modules |
| Unit (dates) | Date VOs: today accepted, past accepted, tomorrow rejected, bad format rejected; handlers reject future date on create and edit | Fixed `today` string / mocked `ClockPort` |
| Unit (clock) | `SystemClock` in `Europe/Madrid`: `2026-01-01T23:30Z` (00:30 CET) -> `2026-01-02`; `2026-07-01T22:30Z` (00:30 CEST) -> `2026-07-02`; `2026-01-01T22:59Z` -> `2026-01-01` | Injected `now` |
| Unit (config) | `APP_TIMEZONE` default applied, invalid zone rejected | `env.validation.spec.ts`, `app.config.spec.ts` |
| E2E | Create -> join -> third user rejected, regenerate invalidates old code, any member edits, isolation, balance, future date rejected | AppModule, tokens signed by a test RSA key served as JWKS; `CLOCK` overridden with a fixed clock |

## Threat Matrix

N/A: there is no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. Auth risks are covered by the guard tests (bad signature, wrong issuer, expired token, missing header).

## Migration / Rollout

Additive migrations, one per context slice. Use chained PRs in this order: auth -> group-members -> groups -> codes -> expenses -> payments -> balances. Down-migrations drop only the new tables.

## Open Questions

- [ ] Before N>2: persist the expense participants instead of deriving them from current members.
