# Proposal: MVP Expense Tracking

## Intent

Splitwise is paid. Build a free, self-owned API for couples to log shared expenses, record payments, and see who owes whom. Future clients (wallet, widget) are out of this change.

## Scope

### In Scope
- Clerk auth via custom RS256/JWKS guard
- Groups with shareable invitation codes; max 2 members (extendable); per-group isolation
- Expenses (EUR, integer cents): amount, payer, date required; description, category, split optional. Split `EQUAL` (50/50 default) or `OTHER_OWES_ALL` (100%). Editable, soft-deleted
- Payments between members: create, edit, soft delete
- Balance (who owes whom) computed on read, plus history
- REST and/or GraphQL transport

### Out of Scope
- UI, monthly/category views, multi-currency, groups over 2 members, bank/wallet ingestion

## Capabilities

### New Capabilities
- `clerk-auth`: core guard verifying Clerk tokens, resolving current user
- `groups`: group lifecycle
- `group-members`: membership, member limit, membership checks
- `group-invitation-codes`: code generation and validation
- `expenses`: expense lifecycle, split rules, soft delete, history
- `payments`: payment lifecycle, soft delete, history
- `balances`: net balance from active expenses and payments

### Modified Capabilities
- None

## Approach

- Six independent bounded contexts (first in repo; set the pattern), each its own module in `CONTEXT_MODULES`. Cross-context calls only via application ports + infrastructure adapters.
- Ownership: `groups` owns Group; `group-members` owns membership and limit; `group-invitation-codes` owns codes; `expenses`/`payments` own their aggregates; `balances` owns no tables.
- Required ports (contracts in design):
  - `expenses`, `payments`, `balances` → `group-members`: is user a member
  - `group-members` → `group-invitation-codes`: resolve/validate code
  - `group-members` → `groups`: group exists
  - `group-invitation-codes` → `groups`/`group-members`: group exists, caller is member
  - `balances` → `expenses`, `payments`: read active records
- Creator auto-membership on group creation: cross-context flow, mechanism decided in design
- `clerk-auth` in `src/core/`; template `AuthClientModule` stays disabled
- Strict TDD at all layers

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/contexts/{groups,group-members,group-invitation-codes,expenses,payments,balances}/` | New | Six contexts |
| `src/contexts/contexts.module.ts` | Modified | Register contexts |
| `src/core/` (auth, config) | Modified | Clerk guard, JWKS/issuer env vars |
| TypeORM migrations | New | groups, group_members, group_invitation_codes, expenses, payments |
| `test/helpers/` | New | Integration/e2e bootstrap |

## Risks

Overall: **Medium-High** — six contexts plus ~8 adapters roughly triple wiring vs. two contexts, and it is the repo's first pattern.

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Exceeds 400-line PR budget | High | Chained PRs, one context per slice |
| Cross-context wiring errors/cycles (`group-members` ↔ `group-invitation-codes` is a candidate cycle) | Med-High | Design resolves direction; acyclic module graph; adapter integration tests |
| Tenant leaks across groups | Med | Membership port on every scoped operation; e2e isolation tests |
| Clerk guard conflicts with template auth | Med | Isolate in core guard |
| Stale `openspec/config.yaml` versions | Low | Fix separately |

## Rollback Plan

Additive. Revert chained PRs in reverse order, remove contexts from `CONTEXT_MODULES`, run down-migrations. No existing data affected.

## Dependencies

- Clerk application (JWKS URL, issuer); PostgreSQL

## Success Criteria

- [ ] Clerk user creates a group; second user joins by code; third rejected
- [ ] Expenses and payments support create, edit, soft delete; history keeps deleted records
- [ ] Balance reflects `EQUAL`, `OTHER_OWES_ALL`, and payments
- [ ] Non-members cannot access group data
- [ ] No context imports another context's internals; all cross-context access via ports
- [ ] Tests pass at all layers; coverage >= 80%
