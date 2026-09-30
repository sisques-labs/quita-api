# Tasks: MVP Expense Tracking

Strict TDD: every unit is RED (failing spec) -> GREEN -> REFACTOR. Specs co-located; unit = `pnpm test`, persistence = `pnpm test:integration`, flows = `pnpm test:e2e`. Each context slice ends with its `README.md`, its migration in `src/database/migrations/`, and `pnpm gen:topics` (never hand-edit `aggregate-module.map.generated.ts`). Imports use `@contexts/{ctx}/` aliases.

## Review Workload Forecast

| Unit | Est. changed lines |
|---|---|
| 1 core (clock, Clerk, config) | ~350 |
| 2 group-members | ~380 |
| 3 groups | ~380 |
| 4 group-invitation-codes | ~380 |
| 5 expenses (incl. Criteria) | ~650 |
| 6 payments (incl. Criteria) | ~550 |
| 7 balances | ~300 |
| **Total** | **~2990** |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

Delivery strategy: ask-on-risk. Units 5 and 6 likely exceed 400; split each in two (domain+handlers / persistence+transport+e2e) if the budget is enforced.

### Suggested Work Units

| Unit | Goal | PR (dependency) | Focused test | Runtime harness | Rollback |
|---|---|---|---|---|---|
| 1 | Clock, Clerk guard, APP_TIMEZONE | PR1 (none) | `pnpm test src/core` | Guard e2e with local JWKS | Revert `src/core/{auth/infrastructure/clerk,clock}` |
| 2 | Membership roster | PR2 (1) | `pnpm test src/contexts/group-members` | Integration: optimistic lock | Revert context + down-migration |
| 3 | Groups | PR3 (2) | `pnpm test src/contexts/groups` | Integration + e2e create/read | Same |
| 4 | Invitation codes + join | PR4 (2,3) | `pnpm test src/contexts/group-invitation-codes` | e2e create -> join -> 3rd rejected | Same |
| 5 | Expenses | PR5 (2) | `pnpm test src/contexts/expenses` | e2e edit by any member, future date | Same |
| 6 | Payments | PR6 (2) | `pnpm test src/contexts/payments` | e2e payment lifecycle | Same |
| 7 | Balances | PR7 (5,6) | `pnpm test src/contexts/balances` | e2e balance + isolation | Revert context (no tables) |

## Phase 1: Core (PR1)

- [x] 1.1 RED: `env.validation.spec.ts`, `app.config.spec.ts`: `APP_TIMEZONE` default `Europe/Madrid`, invalid zone rejected, `CLERK_*` vars. GREEN: edit `env.validation.ts`, `app.config.ts`, create `clerk.config.ts`.
- [x] 1.2 RED: `system-clock.spec.ts` (3 Madrid cases from design). GREEN: `clock.port.ts`, `system-clock.ts`, `clock.module.ts`; import in `core.module.ts`.
- [x] 1.3 RED: `clerk-auth.guard.spec.ts` (valid; bad signature, wrong issuer, expired, missing header) and `auth-user.decorator` spec. GREEN: add `jose`; `clerk-auth.module.ts`, `clerk-auth.guard.ts`, `auth-user.decorator.ts`, `user-id-resolver.ts`.
- [x] 1.4 Update `test/helpers/integration-bootstrap.ts`, `app-bootstrap.ts` with a JWKS test signer. REFACTOR.

## Phase 2: group-members (PR2)

- [x] 2.1 RED/GREEN: `GroupMembershipAggregate` (builder; `addMember` capacity, duplicate), role enum, VOs, exceptions (`GroupMembershipFullException`).
- [x] 2.2 RED/GREEN: `CreateGroupMembershipCommand`, `AddGroupMemberCommand` handlers; `GroupMemberIsMemberQuery`, `GroupMembersFindByGroupIdQuery`, `GroupMembershipFindGroupIdsByUserQuery` handlers.
- [x] 2.3 Integration: TypeORM repo, concurrent-join optimistic lock. Migration `group_memberships`, `group_members`.
- [x] 2.4 Module, `group-member-registered-enums.graphql.ts`, transport list-members resolver, `README.md`, `pnpm gen:topics`.

## Phase 3: groups (PR3)

- [x] 3.1 RED/GREEN: `GroupAggregate`, name VO (missing name rejected), repos, migration `groups`. _(PR3a: aggregate, builder, name VO, event, exceptions, repository interfaces. PR3b: TypeORM entity/mapper/repos, migration `groups`.)_
- [x] 3.2 RED: `CreateGroupHandler` (saves, `createMembership`; compensation delete on failure). GREEN with membership port and adapter (integration over real buses). _(PR3a done: handler + membership port, unit-tested. PR3b: bus adapter + integration over real buses.)_
- [x] 3.3 RED/GREEN: read-group (non-member rejected) and list-own-groups queries; resolvers; `README.md`; `pnpm gen:topics`; e2e. _(PR3a done: both query handlers, `pnpm gen:topics`. PR3b: resolvers, README, e2e.)_

## Phase 4: group-invitation-codes (PR4)

- [x] 4.1 RED/GREEN: aggregate, 8-char Crockford code VO, migration with partial UNIQUE index.
- [x] 4.2 RED/GREEN: Generate (reuse active), Regenerate (transactional), `RedeemInvitationCodeCommand` (unknown/revoked -> `InvitationCodeInvalidException`, already member, full).
- [x] 4.3 Ports/adapters to members, resolvers, `README.md`, `pnpm gen:topics`, e2e (join, third rejected, old code invalid).

## Phase 5: expenses (PR5)

- [x] 5.1 RED/GREEN: `ExpenseDateValueObject` (today/past ok, tomorrow and bad format rejected), amount VO, category/split enums, `ExpenseAggregate`. _(PR5a domain: done, unit-tested, `pnpm gen:topics` regenerated.)_
- [x] 5.2 RED/GREEN: create (defaults, <2 members -> `GroupNotReadyException`), edit (future date rejected, deleted rejected), soft delete; any-member edit.
- [x] 5.3 Migration `expenses`, repos, `ExpensesFindActiveByGroupQuery`, member port/adapter; integration.
- [x] 5.4 RED/GREEN: all six Criteria steps (queryable enum, registry + spec, filter/sort inputs, request DTO, pipe, read repo with 8 operators, deleted rows included); `expense-registered-enums.graphql.ts`; resolvers; `README.md`; `pnpm gen:topics`; e2e.

## Phase 6: payments (PR6)

- [x] 6.1 RED/GREEN: `PaymentDateValueObject`, `PaymentAggregate` (`from != to`, members only), create/edit/soft delete handlers, migration `payments`.
- [x] 6.2 `PaymentsFindActiveByGroupQuery`, ports/adapters, Criteria six steps, registered enums, resolvers, `README.md`, `pnpm gen:topics`, e2e.

## Phase 7: balances (PR7)

- [ ] 7.1 RED: balance calculator specs (equal, odd cent payer absorbs, other-owes-all, payment, deleted ignored; property `sum(net)==0`). GREEN: calculator.
- [ ] 7.2 RED/GREEN: `GroupBalanceViewModel`, query handler with ports to expenses/payments/members (non-member rejected), adapters, resolver, `README.md`, `pnpm gen:topics`.
- [ ] 7.3 Final e2e (full flow, isolation, future date); register all contexts in `contexts.module.ts`; `pnpm test:cov` >= 80%.
