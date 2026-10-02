# payments

Bounded context for settlements between the two members of a group ("I paid
you X"): create, edit, soft delete and a filterable history. Amounts are
integer euro cents. It reaches `group-members` only through a consumer-owned
port, and "today" comes from the core `CLOCK` token.

## Domain

| Concept | Notes |
|---|---|
| `PaymentAggregate` | `groupId`, `fromUserId` (payer), `toUserId` (payee), `amountCents`, `currency` (always `EUR`), `paidOn`, `note?`, `createdBy`, `updatedBy`, `deletedAt`, timestamps. `create()`, `update()` and `delete()` emit events. Payer and payee must differ (`PaymentPartiesMustDifferException`). A deleted payment rejects further edits and deletes. |
| `PaymentDateValueObject` | Date-only `YYYY-MM-DD`. `create(value, today)` rejects a date after `today` (`PaymentDateInFutureException`). |
| `PaymentAmountValueObject` | Positive integer, at most `2147483647`. |

## Application

| Message | Kind | Result |
|---|---|---|
| `CreatePaymentCommand` | command | Members only. Payer and payee must both be members, the date is checked against the clock. Returns the payment id. |
| `EditPaymentCommand` | command | Any member edits any active payment of the group; `updatedBy` records the editor. A changed party must be a member; a future date is rejected. |
| `DeletePaymentCommand` | command | Any member soft-deletes any active payment (`deletedAt`); the row stays. |
| `PaymentsFindByCriteriaQuery` | query | Members only. The handler adds a `groupId` equality filter, drops any client filter on that field, and defaults to `paidOn DESC, createdAt DESC`. Soft-deleted rows are included. |
| `PaymentsFindActiveByGroupQuery` | query | Trusted lookup for other contexts (balances): every non-deleted payment of a group. |

A payment of another group is reported as not found, so ids cannot be probed
across groups.

## Cross-context port

`GroupMembersPort.isMember` (`application/ports`) is implemented by
`GroupMembersBusAdapter` (`infrastructure/adapters`), which dispatches
group-members' `GroupMemberIsMemberQuery` on the bus. `PaymentsModule` does not
import `GroupMembersModule`: the CQRS buses are shared and both modules are
registered in `ContextsModule`.

## Persistence

Table `payments` (migration `1780000000004-CreatePayments`): `amount_cents`
with `CHECK (amount_cents > 0)`, `CHECK (from_user_id <> to_user_id)`,
`paid_on date`, `deleted_at timestamptz`, index `(group_id, deleted_at)`, no
foreign key (groups belong to another context).

`IPaymentReadRepository` extends `IBaseReadRepository<PaymentViewModel>` (plus
`findActiveByGroupId`): `findById` returns the row even when soft-deleted, and
`save` / `delete` are no-ops because the write side persists.

The read repository translates all 8 `FilterOperator`s through the query
builder. Field names are entity properties (`groupId` becomes `group_id`); a
name outside the whitelist is rejected before it can reach SQL. `LIKE` runs on
the column cast to text so it also works on `date` and `integer` columns.

## Transport (GraphQL only)

All operations sit behind `ClerkAuthGuard`; the requester is always the
authenticated user, never an input.

| Operation | Result |
|---|---|
| `createPayment(input: PaymentCreateRequestDto)` | `MutationResponseDto` with the payment id |
| `editPayment(input: PaymentEditRequestDto)` | `MutationResponseDto`; omitted fields are kept, `null` clears `note` |
| `deletePayment(input: PaymentDeleteRequestDto)` | `MutationResponseDto` |
| `payments(groupId, criteria): PaginatedPaymentResultDto` | History with `deletedAt` set on deleted rows |

Find-by-criteria follows the architecture skill's Criteria pattern:
`PaymentQueryableField` (`id`, `fromUserId`, `toUserId`, `paidOn`,
`amountCents`, `createdAt`, `deletedAt`; `groupId` is deliberately not
filterable), the `paymentFilterableFields` registry (+ spec),
`PaymentFilterInput` / `PaymentSortInput`, `PaymentsFindByCriteriaRequestDto`,
`FilterValidationPipe` on the `criteria` argument, and the read repository
above. `PaymentQueryableFieldEnum` is registered in
`transport/graphql/enums/payments-registered-enums.graphql.ts`, side-effect
imported by the module.

## Tests

- Unit: `pnpm test src/contexts/payments`.
- Integration (real Postgres, constraints, all filter operators, isolation):
  `pnpm test:integration` (`test/integration/payments`).
- E2E (edit/delete by any member, future date with a pinned clock, history with
  deleted rows, group isolation): `pnpm test:e2e` (`test/e2e/payments.e2e-spec.ts`).
