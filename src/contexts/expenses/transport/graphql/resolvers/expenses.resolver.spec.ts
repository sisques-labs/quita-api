import { CreateExpenseCommand } from '@contexts/expenses/application/commands/create-expense/create-expense.command';
import { DeleteExpenseCommand } from '@contexts/expenses/application/commands/delete-expense/delete-expense.command';
import { EditExpenseCommand } from '@contexts/expenses/application/commands/edit-expense/edit-expense.command';
import { ExpensesFindByCriteriaQuery } from '@contexts/expenses/application/queries/expenses-find-by-criteria/expenses-find-by-criteria.query';
import { ExpenseBuilder } from '@contexts/expenses/domain/builders/expense.builder';
import { ExpenseCategory } from '@contexts/expenses/domain/enums/expense-category.enum';
import { ExpenseSplitType } from '@contexts/expenses/domain/enums/expense-split-type.enum';
import { ExpenseAccessDeniedException } from '@contexts/expenses/domain/exceptions/expense-access-denied.exception';
import { ExpenseQueryableField } from '@contexts/expenses/transport/graphql/enums/expense-queryable-field.enum';
import { ExpenseGraphQLMapper } from '@contexts/expenses/transport/graphql/mappers/expense-graphql.mapper';
import { ExpensesResolver } from '@contexts/expenses/transport/graphql/resolvers/expenses.resolver';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  FilterOperator,
  PaginatedResult,
  SortDirection,
} from '@sisques-labs/nestjs-kit';
import { MutationResponseGraphQLMapper } from '@sisques-labs/nestjs-kit/graphql';
import { Mocked } from 'vitest';

const EXPENSE_ID = '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11';
const GROUP_ID = '5d1c8f0a-3f55-4b6a-8a27-3a8d3b0d7e22';

describe('ExpensesResolver', () => {
  let commandBus: Mocked<CommandBus>;
  let queryBus: Mocked<QueryBus>;
  let resolver: ExpensesResolver;

  beforeEach(() => {
    commandBus = { execute: vi.fn() } as unknown as Mocked<CommandBus>;
    queryBus = { execute: vi.fn() } as unknown as Mocked<QueryBus>;
    resolver = new ExpensesResolver(
      commandBus,
      queryBus,
      new ExpenseGraphQLMapper(),
      new MutationResponseGraphQLMapper(),
    );
  });

  const sentCommand = <T>(): T => commandBus.execute.mock.calls[0][0] as T;

  it('creates an expense on behalf of the authenticated user, never of input', async () => {
    commandBus.execute.mockResolvedValue(EXPENSE_ID);

    const response = await resolver.createExpense(
      {
        groupId: GROUP_ID,
        amountCents: 1500,
        paidBy: 'user_b',
        spentOn: '2026-03-01',
        category: ExpenseCategory.FOOD,
      },
      { userId: 'user_a' },
    );

    const command = sentCommand<CreateExpenseCommand>();
    expect(command).toBeInstanceOf(CreateExpenseCommand);
    expect(command.requesterId.value).toBe('user_a');
    expect(command.paidBy.value).toBe('user_b');
    expect(command.amount.value).toBe(1500);
    expect(command.category?.value).toBe('food');
    expect(command.splitType.value).toBe(ExpenseSplitType.EQUAL);
    expect(response).toEqual({
      success: true,
      message: 'Expense created successfully',
      id: EXPENSE_ID,
    });
  });

  it('edits only the fields sent, letting null clear a category', async () => {
    commandBus.execute.mockResolvedValue(EXPENSE_ID);

    const response = await resolver.editExpense(
      {
        groupId: GROUP_ID,
        expenseId: EXPENSE_ID,
        amountCents: 900,
        category: null,
      },
      { userId: 'user_b' },
    );

    const command = sentCommand<EditExpenseCommand>();
    expect(command).toBeInstanceOf(EditExpenseCommand);
    expect(command.requesterId.value).toBe('user_b');
    expect(command.changes).toEqual({ amountCents: 900, category: null });
    expect(response).toEqual({
      success: true,
      message: 'Expense edited successfully',
      id: EXPENSE_ID,
    });
  });

  it('soft deletes through the command bus', async () => {
    commandBus.execute.mockResolvedValue(EXPENSE_ID);

    const response = await resolver.deleteExpense(
      { groupId: GROUP_ID, expenseId: EXPENSE_ID },
      { userId: 'user_b' },
    );

    const command = sentCommand<DeleteExpenseCommand>();
    expect(command).toBeInstanceOf(DeleteExpenseCommand);
    expect(command.expenseId.value).toBe(EXPENSE_ID);
    expect(command.requesterId.value).toBe('user_b');
    expect(response.id).toBe(EXPENSE_ID);
    expect(response.message).toBe('Expense deleted successfully');
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
