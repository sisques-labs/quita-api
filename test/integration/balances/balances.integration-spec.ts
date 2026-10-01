import { CommandBus, QueryBus } from '@nestjs/cqrs';

import { BalancesModule } from '../../../src/contexts/balances/balances.module';
import { EXPENSES_PORT } from '../../../src/contexts/balances/application/ports/expenses.port';
import { GROUP_MEMBERS_PORT } from '../../../src/contexts/balances/application/ports/group-members.port';
import { PAYMENTS_PORT } from '../../../src/contexts/balances/application/ports/payments.port';
import { ExpensesPort } from '../../../src/contexts/balances/application/ports/expenses.port';
import { GroupMembersPort } from '../../../src/contexts/balances/application/ports/group-members.port';
import { PaymentsPort } from '../../../src/contexts/balances/application/ports/payments.port';
import { GroupBalanceQuery } from '../../../src/contexts/balances/application/queries/group-balance/group-balance.query';
import { BalanceSplitType } from '../../../src/contexts/balances/domain/enums/balance-split-type.enum';
import { BalanceAccessDeniedException } from '../../../src/contexts/balances/domain/exceptions/balance-access-denied.exception';
import { GroupNotReadyException } from '../../../src/contexts/balances/domain/exceptions/group-not-ready.exception';
import { GroupBalanceViewModel } from '../../../src/contexts/balances/domain/view-models/group-balance.view-model';
import { CreateExpenseCommand } from '../../../src/contexts/expenses/application/commands/create-expense/create-expense.command';
import { DeleteExpenseCommand } from '../../../src/contexts/expenses/application/commands/delete-expense/delete-expense.command';
import { ExpensesModule } from '../../../src/contexts/expenses/expenses.module';
import { GenerateInvitationCodeCommand } from '../../../src/contexts/group-invitation-codes/application/commands/generate-invitation-code/generate-invitation-code.command';
import { RedeemInvitationCodeCommand } from '../../../src/contexts/group-invitation-codes/application/commands/redeem-invitation-code/redeem-invitation-code.command';
import { GroupInvitationCodesModule } from '../../../src/contexts/group-invitation-codes/group-invitation-codes.module';
import { GroupMembersModule } from '../../../src/contexts/group-members/group-members.module';
import { CreateGroupCommand } from '../../../src/contexts/groups/application/commands/create-group/create-group.command';
import { GroupsModule } from '../../../src/contexts/groups/groups.module';
import { CreatePaymentCommand } from '../../../src/contexts/payments/application/commands/create-payment/create-payment.command';
import { DeletePaymentCommand } from '../../../src/contexts/payments/application/commands/delete-payment/delete-payment.command';
import { PaymentsModule } from '../../../src/contexts/payments/payments.module';
import { truncateAll } from '../../helpers/db-reset';
import {
  createIntegrationModule,
  IntegrationContext,
} from '../../helpers/integration-bootstrap';

const SPENT_ON = '2026-01-10';

describe('balances adapters over the real buses (integration)', () => {
  let ctx: IntegrationContext;
  let commands: CommandBus;
  let queries: QueryBus;

  beforeAll(async () => {
    ctx = await createIntegrationModule({
      imports: [
        GroupMembersModule,
        GroupsModule,
        GroupInvitationCodesModule,
        ExpensesModule,
        PaymentsModule,
        BalancesModule,
      ],
    });
    commands = ctx.module.get(CommandBus);
    queries = ctx.module.get(QueryBus);
  });

  afterAll(async () => {
    await ctx.close();
  });

  beforeEach(async () => {
    await truncateAll(ctx.dataSource);
  });

  const createGroup = (ownerId: string): Promise<string> =>
    commands.execute(new CreateGroupCommand({ name: 'Home', ownerId }));

  /** A group of two members: `alice` (owner) and `bob`, joined through a code. */
  const createCouple = async (): Promise<string> => {
    const groupId = await createGroup('alice');
    const code: string = await commands.execute(
      new GenerateInvitationCodeCommand({ groupId, requesterId: 'alice' }),
    );
    await commands.execute(
      new RedeemInvitationCodeCommand({ code, requesterId: 'bob' }),
    );
    return groupId;
  };

  const addExpense = (
    groupId: string,
    paidBy: string,
    amountCents: number,
    splitType: BalanceSplitType = BalanceSplitType.EQUAL,
  ): Promise<string> =>
    commands.execute(
      new CreateExpenseCommand({
        groupId,
        requesterId: paidBy,
        paidBy,
        amountCents,
        spentOn: SPENT_ON,
        splitType,
      }),
    );

  const addPayment = (
    groupId: string,
    fromUserId: string,
    toUserId: string,
    amountCents: number,
  ): Promise<string> =>
    commands.execute(
      new CreatePaymentCommand({
        groupId,
        requesterId: fromUserId,
        fromUserId,
        toUserId,
        amountCents,
        paidOn: SPENT_ON,
      }),
    );

  const balanceOf = (
    groupId: string,
    requesterId: string,
  ): Promise<GroupBalanceViewModel> =>
    queries.execute(new GroupBalanceQuery({ groupId, requesterId }));

  it('10.01 EUR paid by alice with an equal split: bob owes 5.00 EUR', async () => {
    const groupId = await createCouple();
    await addExpense(groupId, 'alice', 1001);

    const balance = await balanceOf(groupId, 'bob');

    expect(balance.settled).toBe(false);
    expect(balance.debts).toEqual([
      { fromUserId: 'bob', toUserId: 'alice', amountCents: 500 },
    ]);
    expect(balance.memberBalances).toEqual(
      expect.arrayContaining([
        { userId: 'alice', netCents: 500 },
        { userId: 'bob', netCents: -500 },
      ]),
    );
  });

  it('OTHER_OWES_ALL makes the other member owe the full amount', async () => {
    const groupId = await createCouple();
    await addExpense(groupId, 'bob', 1000, BalanceSplitType.OTHER_OWES_ALL);

    const balance = await balanceOf(groupId, 'alice');

    expect(balance.debts).toEqual([
      { fromUserId: 'alice', toUserId: 'bob', amountCents: 1000 },
    ]);
  });

  it('a payment settles the debt', async () => {
    const groupId = await createCouple();
    await addExpense(groupId, 'alice', 1000);
    await addPayment(groupId, 'bob', 'alice', 500);

    const balance = await balanceOf(groupId, 'alice');

    expect(balance.settled).toBe(true);
    expect(balance.debts).toEqual([]);
  });

  it('ignores soft-deleted expenses and payments', async () => {
    const groupId = await createCouple();
    await addExpense(groupId, 'alice', 1000);
    const deletedExpense = await addExpense(groupId, 'alice', 4000);
    const deletedPayment = await addPayment(groupId, 'bob', 'alice', 300);
    await commands.execute(
      new DeleteExpenseCommand({
        expenseId: deletedExpense,
        groupId,
        requesterId: 'bob',
      }),
    );
    await commands.execute(
      new DeletePaymentCommand({
        paymentId: deletedPayment,
        groupId,
        requesterId: 'alice',
      }),
    );

    const balance = await balanceOf(groupId, 'alice');

    expect(balance.debts).toEqual([
      { fromUserId: 'bob', toUserId: 'alice', amountCents: 500 },
    ]);
  });

  it('keeps the balances of two groups apart', async () => {
    const first = await createCouple();
    const second = await createCouple();
    await addExpense(first, 'alice', 1000);
    await addExpense(second, 'bob', 600);

    const firstBalance = await balanceOf(first, 'alice');
    const secondBalance = await balanceOf(second, 'alice');

    expect(firstBalance.debts).toEqual([
      { fromUserId: 'bob', toUserId: 'alice', amountCents: 500 },
    ]);
    expect(secondBalance.debts).toEqual([
      { fromUserId: 'alice', toUserId: 'bob', amountCents: 300 },
    ]);
  });

  it('denies a non-member', async () => {
    const groupId = await createCouple();
    await addExpense(groupId, 'alice', 1000);

    await expect(balanceOf(groupId, 'mallory')).rejects.toThrow(
      BalanceAccessDeniedException,
    );
  });

  it('reports a group with only its owner as not ready', async () => {
    const groupId = await createGroup('alice');

    await expect(balanceOf(groupId, 'alice')).rejects.toThrow(
      GroupNotReadyException,
    );
  });

  describe('ports', () => {
    it('lists the roster through group-members', async () => {
      const groupId = await createCouple();
      const port: GroupMembersPort = ctx.module.get(GROUP_MEMBERS_PORT);

      await expect(port.listMemberIds(groupId)).resolves.toEqual(
        expect.arrayContaining(['alice', 'bob']),
      );
      await expect(port.isMember(groupId, 'alice')).resolves.toBe(true);
      await expect(port.isMember(groupId, 'mallory')).resolves.toBe(false);
    });

    it('lists only the active expenses and payments of the group', async () => {
      const groupId = await createCouple();
      const other = await createCouple();
      const expenses: ExpensesPort = ctx.module.get(EXPENSES_PORT);
      const payments: PaymentsPort = ctx.module.get(PAYMENTS_PORT);
      await addExpense(groupId, 'alice', 700);
      const deleted = await addExpense(groupId, 'bob', 900);
      await addExpense(other, 'alice', 111);
      await addPayment(groupId, 'alice', 'bob', 50);
      await commands.execute(
        new DeleteExpenseCommand({
          expenseId: deleted,
          groupId,
          requesterId: 'alice',
        }),
      );

      await expect(expenses.listActiveExpenses(groupId)).resolves.toEqual([
        {
          amountCents: 700,
          paidBy: 'alice',
          splitType: BalanceSplitType.EQUAL,
        },
      ]);
      await expect(payments.listActivePayments(groupId)).resolves.toEqual([
        { fromUserId: 'alice', toUserId: 'bob', amountCents: 50 },
      ]);
    });
  });
});
