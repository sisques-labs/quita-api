```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:6809e3063552dab557f513d2266b009130afba3c7960fc18304755059c29acd9
verdict: pass
blockers: 0
critical_findings: 0
requirements: 22/22
scenarios: 50/50
test_command: pnpm test
test_exit_code: 0
test_output_hash: sha256:6809e3063552dab557f513d2266b009130afba3c7960fc18304755059c29acd9
build_command: pnpm build
build_exit_code: 0
build_output_hash: sha256:506515dc391a12639910cbad31a714a741d56036d0ff0779a0cb74a0d48f0947
```

## Verification Report

**Change**: mvp-expense-tracking
**Version**: N/A
**Mode**: Strict TDD (branch `feat/mvp-coverage-gate`, HEAD 640670b, tip of the stacked chain PR #3 to #20)

### Completeness
| Metric | Value |
|--------|-------|
| Tasks total | 23 checklist items (apply-progress says "28/28": it counted sub-slices differently) |
| Tasks complete | 23 |
| Tasks incomplete | 0 |
| Spec requirements | 22 (7 capabilities) |
| Spec scenarios | 50 |

### Build & Tests Execution
| Command | Exit | Result |
|---|---|---|
| `pnpm exec eslint "{src,apps,libs,test}/**/*.ts"` (lint script without `--fix`, so the tree stays untouched) | 0 | 0 errors; one `boundaries` plugin deprecation notice |
| `pnpm tsc --noEmit` | 0 | clean |
| `pnpm test` | 0 | 101 files, 488 passed, 0 failed, 0 skipped |
| `pnpm gen:topics:check` | 0 | up to date (5 aggregates) |
| `pnpm test:cov` | 0 | 83.00% stmts / 83.81% branches / 83.80% funcs / 83.77% lines (threshold 80) |
| `pnpm test:integration` (real Postgres via `pnpm test:db:up`) | 0 | 6 files, 93 passed |
| `pnpm test:e2e` | 0 | 6 files, 54 passed |
| `pnpm build` | 0 | nest build OK |
| Migrations on scratch DB `quita_verify` (test PG, port 5433) | 0 | run (5 up), revert x5 each succeeded, tables dropped (only `migrations` left), re-run OK; scratch DB dropped, test DB stopped with `pnpm test:db:down` |

`git status` is clean after all runs (no source modified). Generated `dist/` and `coverage/` are git-ignored.

**Coverage**: 83.77% lines / threshold 80% -> Above.

### TDD Compliance
| Check | Result | Details |
|-------|--------|---------|
| TDD evidence reported | ⚠️ | Present per PR in apply-progress #951 as narrative (RED = module-not-found, GREEN counts, triangulation); no uniform per-task table and no Safety Net / Refactor columns |
| All tasks have tests | ✅ | 23/23 tasks map to existing spec files |
| RED confirmed (tests exist) | ✅ | All cited spec and integration files exist |
| GREEN confirmed | ✅ | 488 unit, 93 integration, 54 e2e all pass now |
| Triangulation adequate | ✅ | Multi-case tests (Madrid clock 3 cases, balance calculator 500-case property, etc.) |
| Safety Net for modified files | ➖ | Not reported; only a handful of pre-existing files modified (bootstrap helpers, module wiring) |

Test-after deviations (apply-progress admits them): e2e for groups (PR3b), codes integration+e2e (PR4b), expenses integration+e2e (PR5b), payments e2e partly, balances integration+e2e (PR7b) were written after wiring and "passed first run". Unit layers were RED-first.

### Test Layer Distribution
| Layer | Tests | Files | Tools |
|-------|-------|-------|-------|
| Unit | 488 | 101 | vitest + swc |
| Integration | 93 | 6 | vitest + Postgres |
| E2E | 54 | 6 | vitest + supertest, local JWKS signer |

### Changed File Coverage (unit-only `pnpm test:cov`)
The aggregate passes (83.77%), but every TypeORM read/write repository and both `*-criteria-query.ts` files report 0% in the unit run (for example expenses criteria query L11-61, expense repos L25-74, payments repos L19-163). They are exercised only by `pnpm test:integration`, which is not part of the coverage gate. Clerk guard: 96.15% lines (uncovered L82).

### Assertion Quality
No tautologies, ghost loops or assertion-free tests found. `toBeDefined`/`not.toBeNull` hits (5) are companions of value assertions or are inside a loop over a registry enum with a separate key-set equality check. `toEqual([])` uses all have non-empty companions (for example `balances.integration-spec.ts:155` vs the populated cases, `groups.e2e-spec.ts:76` vs list tests).
**Assertion quality**: 0 CRITICAL, 0 WARNING.

### Spec Compliance Matrix (all scenarios COMPLIANT: covering test exists and passed at runtime)
| Capability / Requirement | Scenario | Test evidence | Result |
|---|---|---|---|
| clerk-auth / Token verification | Valid token | `clerk-auth.guard.spec.ts > accepts a valid token...`; all e2e specs via local JWKS | ✅ |
| | Invalid token | guard spec: missing header, non-bearer, other key, wrong issuer, expired, azp, unconfigured; every e2e `rejects unauthenticated calls` | ✅ |
| clerk-auth / Current user | Current user available | `clerk-auth.guard.spec.ts > resolves a different subject...`; `auth-user.decorator.spec.ts`; resolver specs | ✅ |
| groups / Create group | Create | `groups.e2e-spec.ts > creates a group and makes the creator its owner member`; `group.integration-spec.ts > persists the group...` | ✅ |
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

**Compliance summary**: 50/50 scenarios compliant. Note: there is no dedicated `group-members` e2e file; the capability is covered through groups and codes e2e, integration, and unit specs.

### Correctness (Static Evidence)
All 22 requirements implemented. Every GraphQL resolver class in `src/contexts` carries class-level `@UseGuards(ClerkAuthGuard)` and takes `requesterId` from `@AuthUser()`, never from input. The only unguarded resolver is the template `ping.resolver.ts` (pre-existing, placeholder).

### Coherence (Design)
| Decision | Followed? | Notes |
|----------|-----------|-------|
| #1 redeem in codes, members is leaf | ✅ | Cross-context imports exist only under `infrastructure/adapters/` (scripted check found no violation) plus `contexts.module.ts` |
| #2 sync `createMembership` + compensation | ✅ | `create-group.handler.ts` + integration compensation test |
| #3 roster aggregate, optimistic version | ✅ | Concurrency integration tests |
| #4 Clerk guard in core, RS256 + issuer | ✅ | `algorithms: ['RS256']`, issuer, `createRemoteJWKSet`; fail-closed when unconfigured |
| #5 GraphQL only | ✅ | |
| #6 integer cents, CHECK > 0, EUR | ✅ | migrations |
| #7 soft delete | ✅ | |
| #8 isolation, requester from guard | ✅ | membership assert before data access in every handler; isolation e2e for expenses, payments, balances |
| #10 any member edit/delete | ✅ | |
| #11 reusable code, partial unique index | ✅ | `uq_group_invitation_codes_active_group` |
| #12 category enum + CHECK | ✅ | |
| #14 payer absorbs odd cent | ✅ | |
| #15 future dates rejected on create and edit | ✅ | |
| #16 APP_TIMEZONE clock | ✅ | `SystemClock` via `Intl.DateTimeFormat('en-CA')`, default Europe/Madrid |
| Criteria pattern (six steps) | ✅ | expenses and payments; typed filters, 8 operators, group filter stripped |
| Ports direction | ✅ | consumer-owned ports in `application/ports` |
| Payments port lists `isMember` only (design table also lists `listMemberIds`) | ⚠️ | Documented deviation, unused by payments; harmless |

### Issues Found
**CRITICAL**: None

**WARNING**:
1. Stale docs. `openspec/config.yaml:4` says "NestJS 10 ... pnpm 9.15.4" but `package.json` has `@nestjs/core 11.2.6`, `packageManager pnpm@12.6.0` (and `devEngines >=11`, which makes pnpm print a mismatch warning on every command). `README.md:22-26` still says "Add bounded contexts under src/contexts" and does not mention the six contexts, Clerk auth or new env vars; the README auth row (L37) still describes only Sisques Account.
2. New env vars `CLERK_JWKS_URL`, `CLERK_ISSUER`, `CLERK_AUTHORIZED_PARTIES`, `APP_TIMEZONE` are not referenced in any non-src file (`git grep` found none outside src/test/openspec); `.env.example` was not readable by the verifier (permission denied), but git grep over tracked files shows no hit, so it appears undocumented.
3. Clerk guard `clerk-auth.guard.ts:72-79`: `azp` is only enforced when present. With `CLERK_AUTHORIZED_PARTIES` configured, a validly signed token without `azp` is accepted. Matches the design text ("optional azp") and the implementation is documented, but it weakens the party allow-list.
4. Coverage gate is satisfied only by unit tests (83.77%); all TypeORM repositories and criteria-query translators show 0% in `pnpm test:cov` and rely on integration runs that the gate does not include. A regression in integration-only code is invisible to the threshold.
5. Strict TDD evidence is partial: several integration and e2e suites were written after the wiring (passed first run, per apply-progress), and apply-progress has no uniform TDD Cycle table (no Safety Net or Refactor columns).
6. Apply-progress counts "28/28" tasks while tasks.md has 23 checklist items; bookkeeping mismatch only.

**SUGGESTION**:
1. Guard does not validate `aud`; Clerk session tokens carry none by default, so acceptable, but consider an optional audience setting and `clockTolerance`.
2. No rate limiting on `redeemInvitationCode`; codes are reusable and never expire (design #11), 8 chars Crockford (about 1e12 space, `crypto.randomInt`). Consider throttling to blunt brute force.
3. `delete-expense.handler.ts:42`, `delete-payment.handler.ts:42`, `regenerate-invitation-code.handler.ts:52`, `add-group-member.handler.ts:38`, `create-group-membership.handler.ts:42` use `new Date()` for timestamps instead of the injected clock (not date-rule related; timestamps only).
4. `pnpm lint` script uses `--fix`, so it can mutate files during verification; consider a `lint:check` script.
5. `boundaries/element-types` plugin logs a legacy `${...}` template syntax deprecation; migrate to `{{...}}`.
6. Add a dedicated `group-members` e2e (non-member list denied) and merge integration coverage into the gate.

### Verdict
PASS WITH WARNINGS
All 23 tasks done, 22/22 requirements and 50/50 scenarios covered by passing tests; lint, tsc, unit, integration, e2e, coverage, topics check, build and migration up/down all green; 0 CRITICAL, 6 WARNING (docs drift, undocumented env vars, azp leniency, unit-only coverage gate, test-after in some integration/e2e suites, task-count bookkeeping), 6 SUGGESTION.
