import { ExpensesPort } from '@contexts/balances/application/ports/expenses.port';
import { GroupMembersPort } from '@contexts/balances/application/ports/group-members.port';
import { PaymentsPort } from '@contexts/balances/application/ports/payments.port';
import { GroupBalanceHandler } from '@contexts/balances/application/queries/group-balance/group-balance.handler';
import { GroupBalanceQuery } from '@contexts/balances/application/queries/group-balance/group-balance.query';
import { AssertRequesterIsGroupMemberService } from '@contexts/balances/application/services/read/assert-requester-is-group-member.service';
import { BalanceSplitType } from '@contexts/balances/domain/enums/balance-split-type.enum';
import { BalanceAccessDeniedException } from '@contexts/balances/domain/exceptions/balance-access-denied.exception';
import { GroupNotReadyException } from '@contexts/balances/domain/exceptions/group-not-ready.exception';
import { GroupBalanceCalculator } from '@contexts/balances/domain/services/group-balance/group-balance.service';
import { Mocked } from 'vitest';

const GROUP_ID = '5d1c8f0a-3f55-4b6a-8a27-3a8d3b0d7e22';

describe('GroupBalanceHandler', () => {
  let members: Mocked<GroupMembersPort>;
  let expenses: Mocked<ExpensesPort>;
  let payments: Mocked<PaymentsPort>;
  let handler: GroupBalanceHandler;

  const query = (requesterId = 'user_a') =>
    new GroupBalanceQuery({ groupId: GROUP_ID, requesterId });

  beforeEach(() => {
    members = { isMember: vi.fn(), listMemberIds: vi.fn() };
    expenses = { listActiveExpenses: vi.fn() };
    payments = { listActivePayments: vi.fn() };
    members.isMember.mockResolvedValue(true);
    members.listMemberIds.mockResolvedValue(['user_a', 'user_b']);
    expenses.listActiveExpenses.mockResolvedValue([]);
    payments.listActivePayments.mockResolvedValue([]);
    handler = new GroupBalanceHandler(
      new AssertRequesterIsGroupMemberService(members),
      members,
      expenses,
      payments,
      new GroupBalanceCalculator(),
    );
  });

  it('computes 10.01 EUR paid by A with an equal split as B owing 5.00 EUR', async () => {
    expenses.listActiveExpenses.mockResolvedValue([
      {
        amountCents: 1001,
        paidBy: 'user_a',
        splitType: BalanceSplitType.EQUAL,
      },
    ]);

    const result = await handler.execute(query());

    expect(result.groupId).toBe(GROUP_ID);
    expect(result.currency).toBe('EUR');
    expect(result.settled).toBe(false);
    expect(result.debts).toEqual([
      { fromUserId: 'user_b', toUserId: 'user_a', amountCents: 500 },
    ]);
    expect(expenses.listActiveExpenses).toHaveBeenCalledWith(GROUP_ID);
    expect(payments.listActivePayments).toHaveBeenCalledWith(GROUP_ID);
  });

  it('applies the active payments of the group', async () => {
    expenses.listActiveExpenses.mockResolvedValue([
      {
        amountCents: 1000,
        paidBy: 'user_a',
        splitType: BalanceSplitType.OTHER_OWES_ALL,
      },
    ]);
    payments.listActivePayments.mockResolvedValue([
      { fromUserId: 'user_b', toUserId: 'user_a', amountCents: 1000 },
    ]);

    const result = await handler.execute(query('user_b'));

    expect(result.settled).toBe(true);
    expect(result.debts).toEqual([]);
    expect(result.memberBalances).toEqual([
      { userId: 'user_a', netCents: 0 },
      { userId: 'user_b', netCents: 0 },
    ]);
  });

  it('denies a non-member before touching any other port', async () => {
    members.isMember.mockResolvedValue(false);

    await expect(handler.execute(query('stranger'))).rejects.toThrow(
      BalanceAccessDeniedException,
    );
    expect(members.listMemberIds).not.toHaveBeenCalled();
    expect(expenses.listActiveExpenses).not.toHaveBeenCalled();
    expect(payments.listActivePayments).not.toHaveBeenCalled();
  });

  it('reports a group with a single member as not ready', async () => {
    members.listMemberIds.mockResolvedValue(['user_a']);

    await expect(handler.execute(query())).rejects.toThrow(
      GroupNotReadyException,
    );
  });

  it('rejects a malformed group id', () => {
    expect(
      () => new GroupBalanceQuery({ groupId: 'nope', requesterId: 'user_a' }),
    ).toThrow();
  });

  it('rejects an empty requester id', () => {
    expect(
      () => new GroupBalanceQuery({ groupId: GROUP_ID, requesterId: '' }),
    ).toThrow();
  });
});
