```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:805884ad856ea2497a56d5c2da0b7446a63886fd38ec76da4118bb5e5932ffd0
verdict: pass_with_warnings
blockers: 0
critical_findings: 0
requirements: 23/23
scenarios: 52/52
test_command: pnpm test
test_exit_code: 0
test_output_hash: sha256:805884ad856ea2497a56d5c2da0b7446a63886fd38ec76da4118bb5e5932ffd0
build_command: pnpm build
build_exit_code: 0
build_output_hash: sha256:e83d10a444067ac97701581665bc76e6ef2c0fe57109363cfb39970e75a5bde0
```

## Verification Report

**Change**: mvp-expense-tracking
**Version**: N/A
**Mode**: Strict TDD (re-verification on branch `fix/group-delete-memberships`, HEAD 60a9d17, PR #23 stacked on `feat/mvp-coverage-gate` c5ece69; supersedes the verification done on the older tip 640670b)

### Delta since the previous verification
Changes seen: `delete-group` feature (`DeleteGroupCommand`/handler, `GroupMembershipPort.deleteMemberships`, create-group compensation through the command bus), PR #23 (`DeleteGroupMembershipCommand` + handler in group-members, `GroupMembershipBusAdapter.deleteMemberships`, `DeleteGroupHandler` and `AssertGroupExistsService` registered in `GroupsModule`), design decision #2 reworded (`git diff c5ece69 HEAD` touches 10 files: design.md, 3 new group-members files, 2 modules, adapter + spec, 2 integration specs).
- Resolved: wiring risk of `DeleteGroupHandler` (registered at `groups.module.ts:26` and `:31`) and of `DeleteGroupMembershipHandler` (`group-members.module.ts:34`); scripted check below.
- Still open: previous WARNING 1-6 and SUGGESTION 1-6 (re-confirmed with current evidence).
- New: WARNING 7 (delete-group is outside specs/proposal/tasks/README), WARNING 8 (best-effort cleanup leaves a possible orphan roster, documented only in tests and logs), SUGGESTION 7 (DeleteGroupCommand has no requester check and is a hard delete, safe only while internal).

### Completeness
| Metric | Value |
|--------|-------|
| Tasks total | 23 checklist items, 0 unchecked (apply-progress #951 says "28/28" and predates PR #23: it does not mention delete-group) |
| Tasks complete | 23 |
| Tasks incomplete | 0 |
| Spec requirements | 23 (7 capabilities) |
| Spec scenarios | 52 |

### Build & Tests Execution
| Command | Exit | Result |
|---|---|---|
| `pnpm exec eslint "{src,apps,libs,test}/**/*.ts"` (lint script without `--fix`) | 0 | 0 errors; `boundaries` plugin deprecation notices only |
| `pnpm tsc --noEmit` | 0 | clean |
| `pnpm test` | 0 | 104 files, 504 passed, 0 failed, 0 skipped (was 101 / 488; re-run after the retry change: 504) |
| `pnpm gen:topics:check` | 0 | up to date (5 aggregates) |
| `pnpm test:cov` | 0 | 83.45% stmts / 83.8% branches / 84.21% funcs / 84.19% lines (threshold 80); `delete-group` dir 100% stmts / 50% branches |
| `pnpm test:integration` (real Postgres via `pnpm test:db:up`) | 0 | 6 files, 97 passed (was 93; the log line `members unavailable` comes from the intentional compensation test) |
| `pnpm test:e2e` | 0 | 6 files, 54 passed |
| `pnpm build` | 0 | nest build OK |
| Migrations on scratch DB `quita_verify2` (test PG, port 5433) | 0 | run: 5 executed; revert x5 each succeeded, only `migrations` table left; re-run: 5 executed; scratch DB dropped; `pnpm test:db:down` executed |

`git status` was clean before and after all runs (no source modified). Generated `dist/` and `coverage/` are git-ignored.

**Coverage**: 84.19% lines / threshold 80% -> Above.

### TDD Compliance
| Check | Result | Details |
|-------|--------|---------|
| TDD evidence reported | ⚠️ | Present per PR in apply-progress #951 as narrative (RED = module-not-found, GREEN counts, triangulation); no uniform per-task table and no Safety Net / Refactor columns |
| All tasks have tests | ✅ | 23/23 tasks map to existing spec files |
| RED confirmed (tests exist) | ✅ | All cited spec and integration files exist |
| GREEN confirmed | ✅ | 504 unit, 97 integration, 54 e2e all pass now |
| Triangulation adequate | ✅ | New delete-group tests: handler spec (happy path, not found, cleanup failure, invalid id), adapter spec, 2 integration cases each side. Also multi-case tests (Madrid clock 3 cases, balance calculator 500-case property, etc.) |
| Safety Net for modified files | ➖ | Not reported; only a handful of pre-existing files modified (bootstrap helpers, module wiring) |

The PR #23 / delete-group work has no entry in apply-progress #951 and no checklist item in tasks.md, so its RED-first order cannot be confirmed from the artifacts (commits 38023f3 and 7313b5b each include the spec next to the code). Test-after deviations (apply-progress admits them, unchanged): e2e for groups (PR3b), codes integration+e2e (PR4b), expenses integration+e2e (PR5b), payments e2e partly, balances integration+e2e (PR7b) were written after wiring and "passed first run". Unit layers were RED-first.

### Test Layer Distribution
| Layer | Tests | Files | Tools |
|-------|-------|-------|-------|
| Unit | 504 | 104 | vitest + swc |
| Integration | 97 | 6 | vitest + Postgres |
| E2E | 54 | 6 | vitest + supertest, local JWKS signer |

### Changed File Coverage (unit-only `pnpm test:cov`)
The aggregate passes (84.19% lines), but every TypeORM read/write repository and both `*-criteria-query.ts` files report 0% in the unit run (for example expenses criteria query L11-61, expense repos L25-74, payments repos L19-163). They are exercised only by `pnpm test:integration`, which is not part of the coverage gate. Clerk guard: 96.15% lines (uncovered L82).

### Assertion Quality
No tautologies, ghost loops or assertion-free tests found. `toBeDefined`/`not.toBeNull` hits (5) are companions of value assertions or are inside a loop over a registry enum with a separate key-set equality check. `toEqual([])` uses all have non-empty companions (for example `balances.integration-spec.ts:155` vs the populated cases, `groups.e2e-spec.ts:76` vs list tests).
New tests inspected (`delete-group.handler.spec.ts`, `delete-group-membership.handler.spec.ts`, adapter spec, integration L133/L148/L174 in `group.integration-spec.ts` and the new case in `group-membership.integration-spec.ts`) assert behavior (rows removed, other groups intact, event published, error logged path). The `members unavailable` ERROR lines in the unit run are expected log output from failure-path tests.
**Assertion quality**: 0 CRITICAL, 0 WARNING.

### Spec Compliance Matrix (all scenarios COMPLIANT: covering test exists and passed at runtime)
| Capability / Requirement | Scenario | Test evidence | Result |
|---|---|---|---|
| clerk-auth / Token verification | Valid token | `clerk-auth.guard.spec.ts > accepts a valid token...`; all e2e specs via local JWKS | ✅ |
| | Invalid token | guard spec: missing header, non-bearer, other key, wrong issuer, expired, azp, unconfigured; every e2e `rejects unauthenticated calls` | ✅ |
| clerk-auth / Current user | Current user available | `clerk-auth.guard.spec.ts > resolves a different subject...`; `auth-user.decorator.spec.ts`; resolver specs | ✅ |
| groups / Create group | Create (also compensation path, not a spec scenario: `group.integration-spec.ts:133` deletes the group when the membership command fails) | `groups.e2e-spec.ts > creates a group and makes the creator its owner member`; `group.integration-spec.ts > persists the group...` | ✅ |
| | Missing name | `groups.e2e-spec.ts > rejects a request without a name and a blank name`; name VO spec | ✅ |
| groups / Read group | Non-member read | `groups.e2e-spec.ts > denies reading a group to a non-member`; integration `lets a member read... denies a non-member` | ✅ |
| groups / List own | List | `groups.e2e-spec.ts > lists only the groups the caller belongs to`; integration `lists only the groups the requester belongs to` | ✅ |
| group-members / Member limit | Third rejected | aggregate spec `rejects a third member and leaves the roster unchanged`; integration `joins a second member, then rejects a third`; codes e2e `rejects a third user once the group is full`; concurrency tests | ✅ |
| group-members / Join by code | Join | `group-invitation-codes.e2e-spec.ts > lets a member generate a code and a second user join` | ✅ |
| | Invalid code | codes e2e `rejects unknown and malformed codes` | ✅ |
| | Already a member | codes e2e `treats a repeated redeem...`; integration `does not duplicate a user who joins twice` | ✅ |
| group-members / Membership check | Non-member | `group-membership.integration-spec.ts > lists members for a member and denies a non-member`; group-members resolver spec; non-member denial e2e in groups/expenses/payments/balances/codes | ✅ |
| group-members / List members | List | `groups.e2e-spec.ts` (`groupMembers` query, L60) and codes e2e L81; resolver spec | ✅ |
| group-invitation-codes / Generate | Generate | codes integration `generates one code per group and reuses it`; e2e first test | ✅ |
| | Reuse | integration `lets two different users redeem the same reusable code` | ✅ |
| | Regenerate | codes e2e `invalidates the old code...`; integration `invalidates the old code when the code is regenerated`; `replaceActive` atomicity tests | ✅ |
| | Old code after regeneration | same tests (old code rejected) | ✅ |
| | Non-member | codes e2e `denies a non-member generating or regenerating`; integration `denies code generation to a non-member` | ✅ |
| group-invitation-codes / Validate | Unknown code | codes e2e `rejects unknown and malformed codes`; integration `rejects an unknown code` | ✅ |
| expenses / Create | Defaults | `expenses.e2e-spec.ts > creates an expense with defaults and lists it` | ✅ |
| | Valid category | e2e `stores a valid category and split type` | ✅ |
| | Invalid category | e2e `rejects an invalid category, amount and payer` | ✅ |
| | Invalid input | same e2e; amount/date VO specs; handler spec for payer not member; e2e `rejects an expense while the group has a single member` | ✅ |
| expenses / Edit | Edit by another member | e2e `lets the other member edit and records who did` | ✅ |
| | Non-member edit | e2e `denies a non-member edit and delete` | ✅ |
| expenses / Soft delete | Delete by another member | e2e `lets the other member soft-delete and keeps the row in history` | ✅ |
| | Edit deleted | e2e `rejects editing or deleting a deleted expense` | ✅ |
| expenses / Date not future | Past accepted; Today accepted | e2e `accepts today and yesterday` (clock pinned) | ✅ |
| | Future rejected | e2e `rejects tomorrow on create` | ✅ |
| | Future rejected on edit | e2e `rejects a future date on edit and keeps the stored date` | ✅ |
| expenses / History | List with deleted | e2e `orders by date descending with the deleted expense flagged` | ✅ |
| | Non-member | e2e `denies a non-member listing or creating` | ✅ |
| payments / Create | Create | `payments.e2e-spec.ts > records a payment between the two members and lists it` | ✅ |
| | Invalid | e2e `rejects invalid amounts, equal parties and non-member parties`; DB CHECK `from<>to` integration | ✅ |
| payments / Edit+delete | Edit by another | e2e `lets the other member edit and records who did` | ✅ |
| | Delete by another | e2e `lets the other member soft-delete, keeps the row, and blocks later changes` | ✅ |
| | Non-member | e2e `denies a non-member edit, delete, list and create` | ✅ |
| payments / Date not future | Past; Today | e2e `accepts today and yesterday` | ✅ |
| | Future rejected | e2e `rejects tomorrow on create` | ✅ |
| | Future rejected on edit | e2e `rejects a future date on edit and keeps the stored date` | ✅ |
| payments / History | List with deleted | e2e `orders by date descending with the deleted payment flagged` | ✅ |
| | Non-member | e2e non-member test (list) | ✅ |
| balances / Compute | Equal split | calculator spec `EQUAL: the other member owes half of an even amount`; e2e full couple flow | ✅ |
| | Odd cent | calculator spec `EQUAL odd cent (10.01 EUR...)`; `balances.integration-spec.ts:120` (1001) | ✅ |
| | Other owes all | calculator spec `OTHER_OWES_ALL...`; integration L136 | ✅ |
| | Payment | calculator specs (settle, partial, overpay); e2e full flow reaches settled | ✅ |
| | Deleted ignored | `balances.integration-spec.ts:158 ignores soft-deleted expenses and payments` (real PG); e2e uses DELETE_EXPENSE/DELETE_PAYMENT | ✅ |
| balances / Access control | Non-member | e2e `denies the balance of a group to a non-member`; handler spec | ✅ |

Counts re-done from the spec headings: 23 `### Requirement:` and 52 `#### Scenario:` (was 22 / 50: `specs/groups/spec.md:41` adds `Group creation compensation` with 2 scenarios, covered by `group.integration-spec.ts:133` and `:174` and `delete-group.handler.spec.ts`). Group deletion itself stays internal and has no client-facing requirement (WARNING 7 resolved).

**Compliance summary**: 52/52 scenarios compliant (the 2 new `Group creation compensation` scenarios are covered by the group integration suite and the delete-group handler spec). Note: there is no dedicated `group-members` e2e file; the capability is covered through groups and codes e2e, integration, and unit specs.

### Correctness (Static Evidence)
All 23 requirements implemented. Every GraphQL resolver class in `src/contexts` carries class-level `@UseGuards(ClerkAuthGuard)` and takes `requesterId` from `@AuthUser()`, never from input (scripted: `rg --files-without-match` over all `*resolver.ts` lists only `ping.resolver.ts`, the pre-existing template placeholder, and `user-id-resolver.ts`, which is not a GraphQL resolver).

**delete-group exposure**: NOT exposed through GraphQL. `groups.resolver.ts` has only `createGroup`, `group`, `groups`; `DeleteGroupCommand` is dispatched from exactly one place, `create-group.handler.ts:75` (compensation). No unguarded or non-member-checked path to delete a group exists today. `DeleteGroupHandler` itself performs no requester or membership check (`delete-group.handler.ts:37-58`; the command has only `groupId`), so the safety rests on it staying internal.

**Handler wiring (scripted)**: all 26 `@CommandHandler/@QueryHandler/@EventsHandler` classes outside specs appear at least twice across `*.module.ts` files (import + provider array); 0 unregistered. New ones: `DeleteGroupHandler` (`groups.module.ts:26`), `AssertGroupExistsService` (`:31`), `DeleteGroupMembershipHandler` (`group-members.module.ts:34`). Wiring is proven at runtime by real-bus integration tests (`group.integration-spec.ts:148` removes roster and members through `GroupMembershipBusAdapter`; `group-membership.integration-spec.ts` new case), not only by mocked unit specs.

### Coherence (Design)
| Decision | Followed? | Notes |
|----------|-----------|-------|
| #1 redeem in codes, members is leaf | ✅ | Cross-context imports exist only under `infrastructure/adapters/` (scripted check found no violation) plus `contexts.module.ts` |
| #2 sync `createMembership` + compensation (updated text: `DeleteGroupCommand` then `deleteMemberships`, idempotent) | ✅ | `create-group.handler.ts:46-52,72-81` dispatches `DeleteGroupCommand` through `CommandBus` and swallows+logs a failing compensation, rethrowing the original error; `delete-group.handler.ts:37-58` deletes the group, then best-effort `deleteMemberships`, then publishes `GroupDeletedEvent`; `group-membership-bus.adapter.ts:27-31` maps to `DeleteGroupMembershipCommand`; `delete-group-membership.handler.ts:26-30` is idempotent (`group-membership-typeorm-write.repository.ts:94-98` plain delete by groupId). Matches the design text. Gap: the best-effort semantics are not in the design (WARNING 8) |
| #3 roster aggregate, optimistic version | ✅ | Concurrency integration tests |
| #4 Clerk guard in core, RS256 + issuer | ✅ | `algorithms: ['RS256']`, issuer, `createRemoteJWKSet`; fail-closed when unconfigured |
| #5 GraphQL only | ✅ | |
| #6 integer cents, CHECK > 0, EUR | ✅ | migrations |
| #7 soft delete | ✅ | Expenses and payments soft-delete. Group and roster compensation is a hard delete (`group-typeorm-write.repository.ts:82`), intentional for rollback of a just-created group; see SUGGESTION 7 |
| #8 isolation, requester from guard | ✅ | membership assert before data access in every handler; isolation e2e for expenses, payments, balances |
| #10 any member edit/delete | ✅ | |
| #11 reusable code, partial unique index | ✅ | `uq_group_invitation_codes_active_group` |
| #12 category enum + CHECK | ✅ | |
| #14 payer absorbs odd cent | ✅ | |
| #15 future dates rejected on create and edit | ✅ | |
| #16 APP_TIMEZONE clock | ✅ | `SystemClock` via `Intl.DateTimeFormat('en-CA')`, default Europe/Madrid |
| Criteria pattern (six steps) | ✅ | expenses and payments; typed filters, 8 operators, group filter stripped |
| Ports direction | ✅ | consumer-owned ports in `application/ports`; `GroupMembershipPort.deleteMemberships` is owned by groups. Scripted import check: cross-context imports of group-members only in `groups/infrastructure/adapters/group-membership-bus.adapter.ts` (and `contexts.module.ts`); `create-group.handler.ts` and `delete-group.handler.ts` import only groups-internal modules. `groups.module.ts` does not import `GroupMembersModule` (bus-only) |
| Group isolation, requester != payee, integer cents, APP_TIMEZONE clock, Criteria pattern | ✅ | unchanged by this delta; re-confirmed by green integration and e2e suites |
| Payments port lists `isMember` only (design table also lists `listMemberIds`) | ⚠️ | Documented deviation, unused by payments; harmless |

### Issues Found
**CRITICAL**: None

**WARNING**:
1. (still open) Stale docs. `openspec/config.yaml:4` says "NestJS 10 ... pnpm 9.15.4" but `package.json` has `@nestjs/core 11.2.6`, `packageManager pnpm@12.6.0` (and `devEngines >=11`, which makes pnpm print a mismatch warning on every command). `README.md:22-26` still says "Add bounded contexts under src/contexts" and does not mention the six contexts, Clerk auth or new env vars; the README auth row (L37) still describes only Sisques Account.
2. (still open) New env vars `CLERK_JWKS_URL`, `CLERK_ISSUER`, `CLERK_AUTHORIZED_PARTIES`, `APP_TIMEZONE` are not referenced in any non-src file (`git grep` found none outside src/test/openspec); `.env.example` was not readable by the verifier (permission denied), but git grep over tracked files shows no hit, so it appears undocumented.
3. (still open) Clerk guard `clerk-auth.guard.ts:72-79` (re-read: `typeof authorizedParty === 'string' &&` at L75): `azp` is only enforced when present. With `CLERK_AUTHORIZED_PARTIES` configured, a validly signed token without `azp` is accepted. Matches the design text ("optional azp") and the implementation is documented, but it weakens the party allow-list.
4. (still open) Coverage gate is satisfied only by unit tests (84.19% lines); all TypeORM repositories and criteria-query translators show 0% in `pnpm test:cov` and rely on integration runs that the gate does not include. A regression in integration-only code is invisible to the threshold.
5. (still open, slightly wider) Strict TDD evidence is partial: several integration and e2e suites were written after the wiring (passed first run, per apply-progress), and apply-progress has no uniform TDD Cycle table (no Safety Net or Refactor columns).
6. (still open) Apply-progress counts "28/28" tasks while tasks.md has 23 checklist items (23 checked, 0 unchecked); bookkeeping mismatch only.
7. (RESOLVED) Spec/design coverage gap for `delete-group`. `specs/groups/spec.md` has no requirement or scenario for deleting a group (rg for delete in specs/groups and specs/group-members: no hits); proposal.md, tasks.md and README.md do not mention it either; the only artifact text is design decision #2 (`design.md:20`) describing it as compensation. The implemented behavior (`DeleteGroupCommand`, `GroupDeletedEvent`, `deleteMemberships` port method) is therefore unspecified. Either add a requirement (internal compensation only, or user-facing delete with member/owner rules) or record it as an intentional non-spec internal capability in the change artifacts; add the PR #23 work to tasks.md/apply-progress.
   Resolution: requirement `Group creation compensation` added (`specs/groups/spec.md:41`, 2 scenarios, no client-facing deletion); internal status and semantics recorded in design decision #2 (`design.md:20`) and `src/contexts/groups/README.md:20`. tasks.md/apply-progress bookkeeping is unchanged.
8. (MITIGATED) Best-effort cleanup can leave an orphan roster. `delete-group.handler.ts:40-52`: the group row is deleted first, then `deleteMemberships` failure is caught and only logged (`logger.error`), the handler still publishes the event and returns success. Result: a roster (`group_memberships` + members) for a non-existent group may remain, with no retry or reconciliation job. This is covered by `delete-group.handler.spec.ts:82` and `group.integration-spec.ts:174` but the handler docstring (L16-18, "Deletes the group and its associated memberships") and design #2 do not state the best-effort semantics. Impact is low today: an orphan roster is not reachable through the API (`groups-find-own.handler.ts:30-38` fetches groups by the roster's ids with `findByIds`, which returns nothing for a missing group row, and every other handler asserts the group first), but the stale rows (and the user's slot) stay in the database.
   Mitigation: `deleteMemberships` is now retried up to 3 attempts in total with a 50 ms delay (`delete-group.handler.ts:16-17,75-96`), one warn per retry and a single error log with attempt count and group id after the last failure; semantics and the accepted orphan-roster trade-off are documented in the handler docstring (`delete-group.handler.ts:20-38`), design decision #2 (`design.md:20`) and the groups README. No automatic reconciliation (deliberate); the Kafka inbound consumer alternative is recorded as Deferred in the design.

**SUGGESTION** (1-6 still open):
1. Guard does not validate `aud`; Clerk session tokens carry none by default, so acceptable, but consider an optional audience setting and `clockTolerance`.
2. No rate limiting on `redeemInvitationCode`; codes are reusable and never expire (design #11), 8 chars Crockford (about 1e12 space, `crypto.randomInt`). Consider throttling to blunt brute force.
3. `delete-expense.handler.ts:42`, `delete-payment.handler.ts:42`, `regenerate-invitation-code.handler.ts:52`, `add-group-member.handler.ts:38`, `create-group-membership.handler.ts:42` use `new Date()` for timestamps instead of the injected clock (not date-rule related; timestamps only).
4. `pnpm lint` script uses `--fix`, so it can mutate files during verification; consider a `lint:check` script.
5. `boundaries/element-types` plugin logs a legacy `${...}` template syntax deprecation; migrate to `{{...}}`.
6. Add a dedicated `group-members` e2e (non-member list denied) and merge integration coverage into the gate.
7. (RESOLVED) `DeleteGroupCommand` carries no `requesterId` and `DeleteGroupHandler` has no membership/ownership check, and it hard-deletes (not soft, unlike decision #7) without touching expenses, payments or codes of the group. Safe while only `create-group.handler.ts:75` dispatches it; if it is ever exposed through GraphQL it needs a guard, a requester check, a spec requirement and a cascade or soft-delete decision. Consider a comment in the command marking it internal.
   Resolution: marked `INTERNAL ONLY` with the exposure prerequisites in `delete-group.command.ts:8-16`, in design decision #2 (`design.md:20`) and in `src/contexts/groups/README.md:20`.

### Verdict
PASS WITH WARNINGS
All 23 tasks done, 23/23 requirements and 52/52 scenarios covered by passing tests on the new tip; lint, tsc, unit (504), integration (97), e2e (54), coverage (84.19%), topics check, build and migration up/down all green; all handlers registered; delete-group is internal only. 0 CRITICAL, 6 WARNING (carried over; former WARNING 7 resolved, WARNING 8 mitigated), 6 SUGGESTION open (SUGGESTION 7 resolved).
