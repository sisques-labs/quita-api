import { CreateExpenseCommand } from '@contexts/expenses/application/commands/create-expense/create-expense.command';
import { DeleteExpenseCommand } from '@contexts/expenses/application/commands/delete-expense/delete-expense.command';
import { EditExpenseCommand } from '@contexts/expenses/application/commands/edit-expense/edit-expense.command';
import { ExpenseCategory } from '@contexts/expenses/domain/enums/expense-category.enum';
import { ExpenseSplitType } from '@contexts/expenses/domain/enums/expense-split-type.enum';
import { ExpenseMutationsResolver } from '@contexts/expenses/transport/graphql/resolvers/expense-mutations.resolver';
import { CommandBus } from '@nestjs/cqrs';
import { MutationResponseGraphQLMapper } from '@sisques-labs/nestjs-kit/graphql';
import { Mocked } from 'vitest';

const EXPENSE_ID = '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11';
const GROUP_ID = '5d1c8f0a-3f55-4b6a-8a27-3a8d3b0d7e22';

describe('ExpenseMutationsResolver', () => {
  let commandBus: Mocked<CommandBus>;
  let resolver: ExpenseMutationsResolver;

  beforeEach(() => {
    commandBus = { execute: vi.fn() } as unknown as Mocked<CommandBus>;
    resolver = new ExpenseMutationsResolver(
      commandBus,
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
});
