# balances

Bounded context that answers "who owes whom" for the two members of a group.
It owns **no tables**: the balance is computed on every read from the active
(non-deleted) expenses and payments of the group, so nothing can drift out of
sync. Amounts are integer euro cents. It has no aggregate, only a read model
(`GroupBalanceViewModel`) and a pure calculator.

## Domain

| Concept | Notes |
|---|---|
| `GroupBalanceCalculator` | Pure function of the roster, the active expenses and the active payments. Tracks a net amount per member (positive = is owed). The nets always sum to zero. |
| `BalanceSplitType` | `EQUAL` / `OTHER_OWES_ALL`, balances' own copy of the values (no shared kernel). |
| `BalanceAmountValueObject` | Positive integer cents, at most `2147483647`. |
| `GroupBalanceViewModel` | `groupId`, `currency` (`EUR`), `settled`, `memberBalances[{userId, netCents}]`, `debts[{fromUserId, toUserId, amountCents}]`. |

Rules:

- `EQUAL`: the member who did not pay owes `floor(amount / 2)`; the payer absorbs an odd cent. 10.01 EUR paid by A gives B owing 5.00 EUR.
- `OTHER_OWES_ALL`: the member who did not pay owes the full amount.
- A payment moves its amount from the payer's side to the payee's side, so a payment of what is owed settles it.
- The group must have exactly two members, otherwise `GroupNotReadyException`. A record that mentions a user outside the roster throws `BalanceParticipantUnknownException`.
- `settled` is true when nobody owes anything; `debts` then is empty, otherwise it holds one debt.

## Application

| Message | Kind | Result |
|---|---|---|
| `GroupBalanceQuery` | query | Members only: the membership check runs before any other port is used (`BalanceAccessDeniedException`). Returns the `GroupBalanceViewModel`. |

## Cross-context ports

Three consumer-owned ports live in `application/ports`; their adapters in
`infrastructure/adapters` use only the providers' public bus queries and never
their repositories or entities.

| Port | Adapter dispatches |
|---|---|
| `GroupMembersPort` (`isMember`, `listMemberIds`) | group-members `GroupMemberIsMemberQuery`, `GroupMembersFindByGroupIdQuery` |
| `ExpensesPort` (`listActiveExpenses`) | expenses `ExpensesFindActiveByGroupQuery` |
| `PaymentsPort` (`listActivePayments`) | payments `PaymentsFindActiveByGroupQuery` |

`BalancesModule` does not import the other modules: the CQRS buses are shared
and every context is registered in `ContextsModule`.

## Transport (GraphQL only)

| Operation | Result |
|---|---|
| `balance(groupId): GroupBalanceResponseDto` | Behind `ClerkAuthGuard`; the requester is the authenticated user (`@AuthUser()`), never an input. |

## Tests

- Unit: `pnpm test src/contexts/balances` (includes a seeded property-style test: `sum(net) == 0` over 500 generated scenarios).
- Integration (adapters over real Postgres with the real buses): `pnpm test:integration` (`test/integration/balances`).
- E2E (full couple flow, future dates, group isolation, non-member denied): `pnpm test:e2e` (`test/e2e/balances.e2e-spec.ts`).
