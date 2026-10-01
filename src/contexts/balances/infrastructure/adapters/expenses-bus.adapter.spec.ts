import { BalanceSplitType } from '@contexts/balances/domain/enums/balance-split-type.enum';
import { BalanceSplitTypeUnknownException } from '@contexts/balances/domain/exceptions/balance-split-type-unknown.exception';
import { ExpensesBusAdapter } from '@contexts/balances/infrastructure/adapters/expenses-bus.adapter';
import { ExpensesFindActiveByGroupQuery } from '@contexts/expenses/application/queries/expenses-find-active-by-group/expenses-find-active-by-group.query';
import { ExpenseSplitType } from '@contexts/expenses/domain/enums/expense-split-type.enum';
import { ExpenseViewModel } from '@contexts/expenses/domain/view-models/expense.view-model';
import { QueryBus } from '@nestjs/cqrs';
import { Mocked } from 'vitest';

const GROUP_ID = '5d1c8f0a-3f55-4b6a-8a27-3a8d3b0d7e22';
const NOW = new Date('2026-03-01T10:00:00Z');

const expense = (
  amountCents: number,
  paidBy: string,
  splitType: string,
): ExpenseViewModel =>
  new ExpenseViewModel({
    id: '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11',
    createdAt: NOW,
    updatedAt: NOW,
    groupId: GROUP_ID,
    amountCents,
    currency: 'EUR',
    paidBy,
    spentOn: '2026-03-01',
    description: null,
    category: null,
    splitType: splitType as ExpenseSplitType,
    createdBy: paidBy,
    updatedBy: paidBy,
    deletedAt: null,
  });

describe('ExpensesBusAdapter', () => {
  let queryBus: Mocked<QueryBus>;
  let adapter: ExpensesBusAdapter;

  beforeEach(() => {
    queryBus = { execute: vi.fn() } as unknown as Mocked<QueryBus>;
    adapter = new ExpensesBusAdapter(queryBus);
  });

  it('maps the active expenses of the group to balance entries', async () => {
    queryBus.execute.mockResolvedValue([
      expense(1001, 'user_a', ExpenseSplitType.EQUAL),
      expense(400, 'user_b', ExpenseSplitType.OTHER_OWES_ALL),
    ]);

    await expect(adapter.listActiveExpenses(GROUP_ID)).resolves.toEqual([
      {
        amountCents: 1001,
        paidBy: 'user_a',
        splitType: BalanceSplitType.EQUAL,
      },
      {
        amountCents: 400,
        paidBy: 'user_b',
        splitType: BalanceSplitType.OTHER_OWES_ALL,
      },
    ]);

    const query = queryBus.execute.mock
      .calls[0][0] as ExpensesFindActiveByGroupQuery;
    expect(query).toBeInstanceOf(ExpensesFindActiveByGroupQuery);
    expect(query.groupId.value).toBe(GROUP_ID);
  });

  it('returns no entries for a group without expenses', async () => {
    queryBus.execute.mockResolvedValue([]);

    await expect(adapter.listActiveExpenses(GROUP_ID)).resolves.toEqual([]);
    expect(queryBus.execute).toHaveBeenCalledTimes(1);
  });

  it('rejects a split type the balance does not know', async () => {
    queryBus.execute.mockResolvedValue([expense(100, 'user_a', 'THIRDS')]);

    await expect(adapter.listActiveExpenses(GROUP_ID)).rejects.toThrow(
      BalanceSplitTypeUnknownException,
    );
  });
});
