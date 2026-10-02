import { createE2EApp, E2EContext } from '../helpers/app-bootstrap';
import { truncateAll } from '../helpers/db-reset';

/** "Today" for every flow in this file: the clock is pinned, not the system's. */
const TODAY = '2026-03-15';

const CREATE_GROUP = `
  mutation CreateGroup($input: GroupCreateRequestDto!) {
    createGroup(input: $input) { id }
  }
`;
const GENERATE = `
  mutation Generate($input: GroupInvitationCodeGenerateRequestDto!) {
    generateInvitationCode(input: $input) { code }
  }
`;
const REDEEM = `
  mutation Redeem($input: GroupInvitationCodeRedeemRequestDto!) {
    redeemInvitationCode(input: $input) { id }
  }
`;
const CREATE_EXPENSE = `
  mutation CreateExpense($input: ExpenseCreateRequestDto!) {
    createExpense(input: $input) { success id }
  }
`;
const DELETE_EXPENSE = `
  mutation DeleteExpense($input: ExpenseDeleteRequestDto!) {
    deleteExpense(input: $input) { success id }
  }
`;
const CREATE_PAYMENT = `
  mutation CreatePayment($input: PaymentCreateRequestDto!) {
    createPayment(input: $input) { success id }
  }
`;
const DELETE_PAYMENT = `
  mutation DeletePayment($input: PaymentDeleteRequestDto!) {
    deletePayment(input: $input) { success id }
  }
`;
const BALANCE = `
  query Balance($groupId: ID!) {
    balance(groupId: $groupId) {
      groupId currency settled
      memberBalances { userId netCents }
      debts { fromUserId toUserId amountCents }
    }
  }
`;

interface GraphQLBody {
  data?: Record<string, any>;
  errors?: { extensions: { code: string } }[];
}

describe('Balances (e2e)', () => {
  let ctx: E2EContext;

  beforeAll(async () => {
    ctx = await createE2EApp({ clock: { today: () => TODAY } });
  });

  afterAll(async () => {
    await ctx.close();
  });

  beforeEach(async () => {
    await truncateAll(ctx.dataSource);
  });

  const call = async (
    sub: string | null,
    query: string,
    variables: Record<string, unknown> = {},
  ): Promise<{ body: GraphQLBody }> => {
    const request = ctx.http().post('/graphql').send({ query, variables });
    if (sub) {
      request.set(
        'Authorization',
        `Bearer ${await ctx.clerk.signToken({ sub })}`,
      );
    }
    return request;
  };

  const errorCode = (res: { body: GraphQLBody }) =>
    res.body.errors?.[0].extensions.code;

  const createGroup = async (sub: string): Promise<string> => {
    const res = await call(sub, CREATE_GROUP, { input: { name: 'Home' } });
    return res.body.data!.createGroup.id;
  };

  const invitationCode = async (
    sub: string,
    groupId: string,
  ): Promise<string> => {
    const res = await call(sub, GENERATE, { input: { groupId } });
    return res.body.data!.generateInvitationCode.code;
  };

  const redeem = (sub: string, code: string) =>
    call(sub, REDEEM, { input: { code } });

  /** A group of `user_A` (owner) and `user_B`, joined through an invitation code. */
  const createCouple = async (
    owner = 'user_A',
    guest = 'user_B',
  ): Promise<string> => {
    const groupId = await createGroup(owner);
    await redeem(guest, await invitationCode(owner, groupId));
    return groupId;
  };

  const addExpense = async (
    sub: string,
    groupId: string,
    fields: Record<string, unknown>,
  ): Promise<string> => {
    const res = await call(sub, CREATE_EXPENSE, {
      input: { groupId, spentOn: '2026-03-01', ...fields },
    });
    expect(res.body.errors).toBeUndefined();
    return res.body.data!.createExpense.id;
  };

  const addPayment = async (
    sub: string,
    groupId: string,
    fields: Record<string, unknown>,
  ): Promise<string> => {
    const res = await call(sub, CREATE_PAYMENT, {
      input: { groupId, paidOn: '2026-03-01', ...fields },
    });
    expect(res.body.errors).toBeUndefined();
    return res.body.data!.createPayment.id;
  };

  const balance = async (sub: string | null, groupId: string) =>
    call(sub, BALANCE, { groupId });

  it('follows the full couple flow from the empty group to the settled balance', async () => {
    const groupId = await createGroup('user_A');

    // A lone owner has no second member yet.
    const early = await balance('user_A', groupId);
    expect(errorCode(early)).toBe('GroupNotReadyException');

    // The partner joins by code; a third user is turned away.
    const code = await invitationCode('user_A', groupId);
    expect((await redeem('user_B', code)).body.errors).toBeUndefined();
    expect(errorCode(await redeem('user_C', code))).toBe(
      'GroupMembershipFullException',
    );

    const empty = await balance('user_B', groupId);
    expect(empty.body.data!.balance).toEqual({
      groupId,
      currency: 'EUR',
      settled: true,
      memberBalances: [
        { userId: 'user_A', netCents: 0 },
        { userId: 'user_B', netCents: 0 },
      ],
      debts: [],
    });

    // 10.01 EUR paid by A, split equally: B owes 5.00 EUR.
    await addExpense('user_A', groupId, {
      amountCents: 1001,
      paidBy: 'user_A',
      splitType: 'EQUAL',
    });
    const afterEqual = await balance('user_B', groupId);
    expect(afterEqual.body.data!.balance).toMatchObject({
      settled: false,
      debts: [{ fromUserId: 'user_B', toUserId: 'user_A', amountCents: 500 }],
    });

    // B pays 4.00 EUR for which A owes everything: the net flips the other way.
    const expenseToDelete = await addExpense('user_B', groupId, {
      amountCents: 400,
      paidBy: 'user_B',
      splitType: 'OTHER_OWES_ALL',
    });
    const afterOwesAll = await balance('user_A', groupId);
    expect(afterOwesAll.body.data!.balance.debts).toEqual([
      { fromUserId: 'user_B', toUserId: 'user_A', amountCents: 100 },
    ]);

    // Deleting an expense changes the balance.
    const deleted = await call('user_A', DELETE_EXPENSE, {
      input: { groupId, expenseId: expenseToDelete },
    });
    expect(deleted.body.errors).toBeUndefined();
    const afterDelete = await balance('user_A', groupId);
    expect(afterDelete.body.data!.balance.debts).toEqual([
      { fromUserId: 'user_B', toUserId: 'user_A', amountCents: 500 },
    ]);

    // A payment settles the remaining debt; deleting it brings the debt back.
    const paymentId = await addPayment('user_B', groupId, {
      fromUserId: 'user_B',
      toUserId: 'user_A',
      amountCents: 500,
    });
    const settled = await balance('user_B', groupId);
    expect(settled.body.data!.balance).toMatchObject({
      settled: true,
      debts: [],
    });

    await call('user_A', DELETE_PAYMENT, { input: { groupId, paymentId } });
    const reopened = await balance('user_B', groupId);
    expect(reopened.body.data!.balance).toMatchObject({
      settled: false,
      debts: [{ fromUserId: 'user_B', toUserId: 'user_A', amountCents: 500 }],
    });
  });

  it('rejects entries dated in the future before they reach the balance', async () => {
    const groupId = await createCouple();

    const expense = await call('user_A', CREATE_EXPENSE, {
      input: {
        groupId,
        amountCents: 1000,
        paidBy: 'user_A',
        spentOn: '2026-03-16',
      },
    });
    const payment = await call('user_B', CREATE_PAYMENT, {
      input: {
        groupId,
        fromUserId: 'user_B',
        toUserId: 'user_A',
        amountCents: 100,
        paidOn: '2026-03-16',
      },
    });

    expect(errorCode(expense)).toBe('ExpenseDateInFutureException');
    expect(errorCode(payment)).toBe('PaymentDateInFutureException');
    const result = await balance('user_A', groupId);
    expect(result.body.data!.balance.settled).toBe(true);
  });

  it('keeps the balances of two groups isolated', async () => {
    const first = await createCouple('user_A', 'user_B');
    const second = await createCouple('user_C', 'user_D');
    await addExpense('user_A', first, {
      amountCents: 1000,
      paidBy: 'user_A',
    });
    await addExpense('user_D', second, {
      amountCents: 600,
      paidBy: 'user_D',
      splitType: 'OTHER_OWES_ALL',
    });

    const firstBalance = await balance('user_B', first);
    const secondBalance = await balance('user_C', second);

    expect(firstBalance.body.data!.balance.debts).toEqual([
      { fromUserId: 'user_B', toUserId: 'user_A', amountCents: 500 },
    ]);
    expect(secondBalance.body.data!.balance.debts).toEqual([
      { fromUserId: 'user_C', toUserId: 'user_D', amountCents: 600 },
    ]);
  });

  it('denies the balance of a group to a non-member', async () => {
    const groupId = await createCouple();
    await addExpense('user_A', groupId, {
      amountCents: 1000,
      paidBy: 'user_A',
    });

    const outsider = await balance('user_C', groupId);
    await createGroup('user_D');
    const crossGroup = await balance('user_D', groupId);

    expect(errorCode(outsider)).toBe('BalanceAccessDeniedException');
    expect(outsider.body.data).toBeNull();
    expect(errorCode(crossGroup)).toBe('BalanceAccessDeniedException');
  });

  it('requires authentication', async () => {
    const groupId = await createCouple();

    const res = await balance(null, groupId);

    expect(res.body.errors).toHaveLength(1);
    expect(errorCode(res)).toBe('UNAUTHENTICATED');
    expect(res.body.data).toBeNull();
  });
});
