# expenses

Bounded context for the shared expenses of a group: create, edit, soft delete
and a filterable history. Amounts are integer euro cents. It reaches
`group-members` only through a consumer-owned port, and "today" comes from the
core `CLOCK` token.

## Domain

| Concept | Notes |
|---|---|
| `ExpenseAggregate` | `groupId`, `amountCents`, `currency` (always `EUR`), `paidBy`, `spentOn`, `description?`, `category?`, `splitType`, `createdBy`, `updatedBy`, `deletedAt`, timestamps. `create()`, `update()` and `delete()` emit events. A deleted expense rejects further edits and deletes. |
| `ExpenseDateValueObject` | Date-only `YYYY-MM-DD`. `create(value, today)` rejects a date after `today` (`ExpenseDateInFutureException`). |
| `ExpenseAmountValueObject` | Positive integer, at most `2147483647`. |
| `ExpenseCategory` | `food`, `home`, `transport`, `leisure`, `health`, `travel`, `shopping`, `bills`, `other`. |
| `ExpenseSplitType` | `EQUAL` (default) or `OTHER_OWES_ALL`. |

## Application

| Message | Kind | Result |
|---|---|---|
| `CreateExpenseCommand` | command | Members only. The group needs at least two members (`GroupNotReadyException`), the payer must be one of them, the date is checked against the clock. Returns the expense id. |
| `EditExpenseCommand` | command | Any member edits any active expense of the group; `updatedBy` records the editor. A changed payer must be a member; a future date is rejected. |
| `DeleteExpenseCommand` | command | Any member soft-deletes any active expense (`deletedAt`); the row stays. |
| `ExpensesFindByCriteriaQuery` | query | Members only. The handler adds a `groupId` equality filter, drops any client filter on that field, and defaults to `spentOn DESC, createdAt DESC`. Soft-deleted rows are included. |
| `ExpensesFindActiveByGroupQuery` | query | Trusted lookup for other contexts (balances): every non-deleted expense of a group. |

An expense of another group is reported as not found, so ids cannot be probed
across groups.

## Cross-context port

`GroupMembersPort` (`application/ports`) is implemented by
`GroupMembersBusAdapter` (`infrastructure/adapters`), the only place allowed to
import another context. It maps to group-members' public queries only:

| Port method | group-members message |
|---|---|
| `isMember(groupId, userId)` | `GroupMemberIsMemberQuery` |
| `listMemberIds(groupId)` | `GroupMembersFindByGroupIdQuery` |

`ExpensesModule` does not import `GroupMembersModule`: the CQRS buses are
shared and both modules are registered in `ContextsModule`. `CLOCK` is provided
globally by the core `ClockModule`.

## Persistence

Table `expenses` (migration `1780000000003-CreateExpenses`):

- `amount_cents integer` with `CHECK (amount_cents > 0)`.
- `spent_on date`, read back as a date-only string.
- `category varchar(16)` with a `CHECK` on the nine category values (or `NULL`),
  `split_type varchar(16)` with a `CHECK` on the two split types.
- `deleted_at timestamptz` (soft delete), `updated_by`.
- Index `(group_id, deleted_at)`. No foreign key: groups belong to another context.

`IExpenseReadRepository` extends `IBaseReadRepository<ExpenseViewModel>` (plus
`findActiveByGroupId`): `findById` returns the row even when soft-deleted, and
`save` / `delete` are no-ops because the write side persists.

The read repository translates `criteria.filters` through the query builder and
covers all 8 `FilterOperator`s. Field names are entity properties that TypeORM
resolves to columns (`groupId` becomes `group_id`); a name outside the
whitelist is rejected before it can reach SQL. `LIKE` runs on the column cast to
text so it also works on the `date` and `integer` columns.

## Transport (GraphQL only)

All operations sit behind `ClerkAuthGuard`; the requester is always the
authenticated user (`@AuthUser()`), never an input.

| Operation | Result |
|---|---|
| `createExpense(input: CreateExpenseInput)` | `MutationResponseDto` with the expense id |
| `editExpense(input: EditExpenseInput)` | `MutationResponseDto`; omitted fields are kept, `null` clears `description` and `category` |
| `deleteExpense(input: DeleteExpenseInput)` | `MutationResponseDto` |
| `expenses(groupId, criteria): PaginatedExpenseResult` | History with `deletedAt` set on deleted rows |

Find-by-criteria follows the architecture skill's Criteria pattern:

1. `ExpenseQueryableField` (`transport/graphql/enums`): `id`, `paidBy`, `spentOn`,
   `amountCents`, `category`, `splitType`, `createdAt`, `deletedAt`. `groupId` is
   deliberately not filterable.
2. `expenseFilterableFields` registry (+ spec); enum columns reuse the domain enums.
3. `ExpenseFilterInput` / `ExpenseSortInput` from the kit factories.
4. `ExpensesFindByCriteriaRequestDto` with the typed filters and sorts.
5. `FilterValidationPipe(expenseFilterableFields)` on the `criteria` argument.
6. The read repository described above.

`ExpenseCategory`, `ExpenseSplitType` and `ExpenseQueryableFieldEnum` are
registered in `transport/graphql/enums/expenses-registered-enums.graphql.ts`,
side-effect imported by the module (core registers only the shared kit enums).

## Tests

- Unit: `pnpm test src/contexts/expenses`.
- Integration (real Postgres, constraints, all filter operators, isolation):
  `pnpm test:integration` (`test/integration/expenses`).
- E2E (edit/delete by any member, future date with a pinned clock, history with
  deleted rows, group isolation): `pnpm test:e2e` (`test/e2e/expenses.e2e-spec.ts`).
