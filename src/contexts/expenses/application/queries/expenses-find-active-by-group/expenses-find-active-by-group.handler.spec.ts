import { ExpensesFindActiveByGroupHandler } from '@contexts/expenses/application/queries/expenses-find-active-by-group/expenses-find-active-by-group.handler';
import { ExpensesFindActiveByGroupQuery } from '@contexts/expenses/application/queries/expenses-find-active-by-group/expenses-find-active-by-group.query';
import { ExpenseBuilder } from '@contexts/expenses/domain/builders/expense.builder';
import { ExpenseReadRepository } from '@contexts/expenses/domain/repositories/read/expense-read.repository';
import { Mocked } from 'vitest';

const GROUP_ID = '5d1c8f0a-3f55-4b6a-8a27-3a8d3b0d7e22';

describe('ExpensesFindActiveByGroupHandler', () => {
  let repository: Mocked<ExpenseReadRepository>;
  let handler: ExpensesFindActiveByGroupHandler;

  beforeEach(() => {
    repository = { findByCriteria: vi.fn(), findActiveByGroupId: vi.fn() };
    handler = new ExpensesFindActiveByGroupHandler(repository);
  });

  it('returns the active expenses of the group', async () => {
    const expenses = [
      new ExpenseBuilder()
        .withId('0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11')
        .withGroupId(GROUP_ID)
        .withAmountCents(100)
        .withPaidBy('user_a')
        .withSpentOn('2026-09-29')
        .withCreatedBy('user_a')
        .buildViewModel(),
    ];
    repository.findActiveByGroupId.mockResolvedValue(expenses);

    const result = await handler.execute(
      new ExpensesFindActiveByGroupQuery({ groupId: GROUP_ID }),
    );

    expect(result).toBe(expenses);
    expect(repository.findActiveByGroupId).toHaveBeenCalledWith(GROUP_ID);
  });

  it('rejects a malformed group id', () => {
    expect(
      () => new ExpensesFindActiveByGroupQuery({ groupId: 'nope' }),
    ).toThrow();
  });
});
