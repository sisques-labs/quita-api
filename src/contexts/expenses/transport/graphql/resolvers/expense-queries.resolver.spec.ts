import { ExpensesFindByCriteriaQuery } from '@contexts/expenses/application/queries/expenses-find-by-criteria/expenses-find-by-criteria.query';
import { ExpenseBuilder } from '@contexts/expenses/domain/builders/expense.builder';
import { ExpenseAccessDeniedException } from '@contexts/expenses/domain/exceptions/expense-access-denied.exception';
import { ExpenseQueryableField } from '@contexts/expenses/transport/graphql/enums/expense-queryable-field.enum';
import { ExpenseGraphQLMapper } from '@contexts/expenses/transport/graphql/mappers/expense-graphql.mapper';
import { ExpenseQueriesResolver } from '@contexts/expenses/transport/graphql/resolvers/expense-queries.resolver';
import { QueryBus } from '@nestjs/cqrs';
import {
  FilterOperator,
  PaginatedResult,
  SortDirection,
} from '@sisques-labs/nestjs-kit';
import { Mocked } from 'vitest';

const EXPENSE_ID = '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11';
const GROUP_ID = '5d1c8f0a-3f55-4b6a-8a27-3a8d3b0d7e22';

describe('ExpenseQueriesResolver', () => {
  let queryBus: Mocked<QueryBus>;
  let resolver: ExpenseQueriesResolver;

  beforeEach(() => {
    queryBus = { execute: vi.fn() } as unknown as Mocked<QueryBus>;
    resolver = new ExpenseQueriesResolver(queryBus, new ExpenseGraphQLMapper());
  });

  it('lists the history with a criteria built from the typed input', async () => {
    queryBus.execute.mockResolvedValue(
      new PaginatedResult(
        [
          new ExpenseBuilder()
            .withId(EXPENSE_ID)
            .withGroupId(GROUP_ID)
            .withAmountCents(100)
            .withPaidBy('user_a')
            .withSpentOn('2026-03-01')
            .withCreatedBy('user_a')
            .buildViewModel(),
        ],
        1,
        1,
        10,
      ),
    );

    const page = await resolver.expenses(
      GROUP_ID,
      {
        filters: [
          {
            field: ExpenseQueryableField.CATEGORY,
            operator: FilterOperator.EQUALS,
            value: 'food',
          },
        ],
        sorts: [
          {
            field: ExpenseQueryableField.AMOUNT_CENTS,
            direction: SortDirection.ASC,
          },
        ],
        pagination: { page: 2, perPage: 5 },
      },
      { userId: 'user_a' },
    );

    const query = queryBus.execute.mock
      .calls[0][0] as ExpensesFindByCriteriaQuery;
    expect(query).toBeInstanceOf(ExpensesFindByCriteriaQuery);
    expect(query.groupId.value).toBe(GROUP_ID);
    expect(query.requesterId.value).toBe('user_a');
    expect(query.criteria.filters).toEqual([
      { field: 'category', operator: FilterOperator.EQUALS, value: 'food' },
    ]);
    expect(query.criteria.sorts).toEqual([
      { field: 'amountCents', direction: SortDirection.ASC },
    ]);
    expect(query.criteria.pagination).toEqual({ page: 2, perPage: 5 });
    expect(page.items.map((item) => item.id)).toEqual([EXPENSE_ID]);
  });

  it('lists with an empty criteria when none is given', async () => {
    queryBus.execute.mockResolvedValue(new PaginatedResult([], 0, 1, 10));

    await resolver.expenses(GROUP_ID, undefined, { userId: 'user_a' });

    const query = queryBus.execute.mock
      .calls[0][0] as ExpensesFindByCriteriaQuery;
    expect(query.criteria.filters).toEqual([]);
    expect(query.criteria.sorts).toEqual([]);
  });

  it('propagates access denied for non-members', async () => {
    queryBus.execute.mockRejectedValue(
      new ExpenseAccessDeniedException('N', GROUP_ID),
    );

    await expect(
      resolver.expenses(GROUP_ID, undefined, { userId: 'N' }),
    ).rejects.toThrow(ExpenseAccessDeniedException);
  });
});
