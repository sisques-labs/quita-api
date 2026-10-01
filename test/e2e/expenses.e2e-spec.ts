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
    createExpense(input: $input) { success message id }
  }
`;
const EDIT_EXPENSE = `
  mutation EditExpense($input: ExpenseEditRequestDto!) {
    editExpense(input: $input) { success id }
  }
`;
const DELETE_EXPENSE = `
  mutation DeleteExpense($input: ExpenseDeleteRequestDto!) {
    deleteExpense(input: $input) { success id }
  }
`;
const EXPENSES = `
  query Expenses($groupId: ID!, $criteria: ExpensesFindByCriteriaRequestDto) {
    expenses(groupId: $groupId, criteria: $criteria) {
      total page perPage totalPages
      items {
        id groupId amountCents currency paidBy spentOn description category
        splitType createdBy updatedBy deletedAt
      }
    }
  }
`;

describe('Expenses (e2e)', () => {
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
  ) => {
    const request = ctx.http().post('/graphql').send({ query, variables });
    if (sub) {
      request.set(
        'Authorization',
        `Bearer ${await ctx.clerk.signToken({ sub })}`,
      );
    }
    return request;
  };

  const createGroup = async (sub: string): Promise<string> => {
    const res = await call(sub, CREATE_GROUP, { input: { name: 'Home' } });
    return res.body.data.createGroup.id;
  };

  /** A group of `user_A` (owner) and `user_B`, joined through an invitation code. */
  const createCouple = async (): Promise<string> => {
    const groupId = await createGroup('user_A');
    const generated = await call('user_A', GENERATE, { input: { groupId } });
    const { code } = generated.body.data.generateInvitationCode;
    await call('user_B', REDEEM, { input: { code } });
    return groupId;
  };

  const createExpense = async (
    sub: string,
    groupId: string,
    fields: Record<string, unknown> = {},
  ) =>
    call(sub, CREATE_EXPENSE, {
      input: {
        groupId,
        amountCents: 1000,
        paidBy: 'user_A',
        spentOn: '2026-03-01',
        ...fields,
      },
    });

  const createdId = async (
    sub: string,
    groupId: string,
    fields: Record<string, unknown> = {},
  ): Promise<string> => {
    const res = await createExpense(sub, groupId, fields);
    expect(res.body.errors).toBeUndefined();
    return res.body.data.createExpense.id;
  };

  const list = async (
    sub: string,
    groupId: string,
    criteria?: Record<string, unknown>,
  ) => call(sub, EXPENSES, { groupId, criteria });

  it('creates an expense with defaults and lists it', async () => {
    const groupId = await createCouple();

    const res = await createExpense('user_A', groupId, { paidBy: 'user_B' });
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.createExpense).toMatchObject({
      success: true,
      message: 'Expense created successfully',
    });

    const history = await list('user_B', groupId);
    expect(history.body.data.expenses.total).toBe(1);
    expect(history.body.data.expenses.items[0]).toMatchObject({
      id: res.body.data.createExpense.id,
      groupId,
      amountCents: 1000,
      currency: 'EUR',
      paidBy: 'user_B',
      spentOn: '2026-03-01',
      description: null,
      category: null,
      splitType: 'EQUAL',
      createdBy: 'user_A',
      updatedBy: 'user_A',
      deletedAt: null,
    });
  });

  it('stores a valid category and split type', async () => {
    const groupId = await createCouple();

    await createdId('user_A', groupId, {
      category: 'FOOD',
      splitType: 'OTHER_OWES_ALL',
      description: 'Dinner',
    });

    const item = (await list('user_A', groupId)).body.data.expenses.items[0];
    expect(item).toMatchObject({
      category: 'FOOD',
      splitType: 'OTHER_OWES_ALL',
      description: 'Dinner',
    });
  });

  it('rejects an invalid category, amount and payer', async () => {
    const groupId = await createCouple();

    const category = await createExpense('user_A', groupId, {
      category: 'pets',
    });
    expect(category.body.errors).toHaveLength(1);

    const zero = await createExpense('user_A', groupId, { amountCents: 0 });
    expect(zero.body.errors).toHaveLength(1);

    const fractional = await createExpense('user_A', groupId, {
      amountCents: 10.5,
    });
    expect(fractional.body.errors).toHaveLength(1);

    const payer = await createExpense('user_A', groupId, {
      paidBy: 'user_X',
    });
    expect(payer.body.errors[0].extensions.code).toBe(
      'ExpensePayerNotMemberException',
    );

    const history = await list('user_A', groupId);
    expect(history.body.data.expenses.total).toBe(0);
  });

  it('rejects an expense while the group has a single member', async () => {
    const groupId = await createGroup('user_A');

    const res = await createExpense('user_A', groupId);

    expect(res.body.errors[0].extensions.code).toBe('GroupNotReadyException');
  });

  describe('date not in the future (clock pinned to 2026-03-15)', () => {
    it('accepts today and yesterday', async () => {
      const groupId = await createCouple();

      const today = await createExpense('user_A', groupId, { spentOn: TODAY });
      const yesterday = await createExpense('user_A', groupId, {
        spentOn: '2026-03-14',
      });

      expect(today.body.errors).toBeUndefined();
      expect(yesterday.body.errors).toBeUndefined();
    });

    it('rejects tomorrow on create', async () => {
      const groupId = await createCouple();

      const res = await createExpense('user_A', groupId, {
        spentOn: '2026-03-16',
      });

      expect(res.body.errors[0].extensions.code).toBe(
        'ExpenseDateInFutureException',
      );
      expect((await list('user_A', groupId)).body.data.expenses.total).toBe(0);
    });

    it('rejects a future date on edit and keeps the stored date', async () => {
      const groupId = await createCouple();
      const id = await createdId('user_A', groupId, { spentOn: '2026-03-01' });

      const res = await call('user_B', EDIT_EXPENSE, {
        input: { groupId, expenseId: id, spentOn: '2026-03-16' },
      });

      expect(res.body.errors[0].extensions.code).toBe(
        'ExpenseDateInFutureException',
      );
      const item = (await list('user_A', groupId)).body.data.expenses.items[0];
      expect(item.spentOn).toBe('2026-03-01');
    });

    it('rejects a malformed date', async () => {
      const groupId = await createCouple();

      const res = await createExpense('user_A', groupId, {
        spentOn: '15/03/2026',
      });

      expect(res.body.errors[0].extensions.code).toBe(
        'ExpenseDateInvalidException',
      );
    });
  });

  describe('edit and delete by any member', () => {
    it('lets the other member edit and records who did', async () => {
      const groupId = await createCouple();
      const id = await createdId('user_A', groupId, { category: 'FOOD' });

      const res = await call('user_B', EDIT_EXPENSE, {
        input: { groupId, expenseId: id, amountCents: 2500, category: null },
      });

      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.editExpense).toEqual({ success: true, id });
      const item = (await list('user_A', groupId)).body.data.expenses.items[0];
      expect(item).toMatchObject({
        amountCents: 2500,
        category: null,
        createdBy: 'user_A',
        updatedBy: 'user_B',
      });
    });

    it('lets the other member soft-delete and keeps the row in history', async () => {
      const groupId = await createCouple();
      const id = await createdId('user_A', groupId);

      const res = await call('user_B', DELETE_EXPENSE, {
        input: { groupId, expenseId: id },
      });

      expect(res.body.errors).toBeUndefined();
      const history = await list('user_A', groupId);
      expect(history.body.data.expenses.total).toBe(1);
      expect(history.body.data.expenses.items[0].id).toBe(id);
      expect(history.body.data.expenses.items[0].deletedAt).not.toBeNull();
    });

    it('rejects editing or deleting a deleted expense', async () => {
      const groupId = await createCouple();
      const id = await createdId('user_A', groupId);
      await call('user_B', DELETE_EXPENSE, {
        input: { groupId, expenseId: id },
      });

      const edit = await call('user_A', EDIT_EXPENSE, {
        input: { groupId, expenseId: id, amountCents: 5 },
      });
      const again = await call('user_A', DELETE_EXPENSE, {
        input: { groupId, expenseId: id },
      });

      expect(edit.body.errors[0].extensions.code).toBe(
        'ExpenseAlreadyDeletedException',
      );
      expect(again.body.errors[0].extensions.code).toBe(
        'ExpenseAlreadyDeletedException',
      );
    });

    it('denies a non-member edit and delete', async () => {
      const groupId = await createCouple();
      const id = await createdId('user_A', groupId);

      const edit = await call('user_X', EDIT_EXPENSE, {
        input: { groupId, expenseId: id, amountCents: 5 },
      });
      const del = await call('user_X', DELETE_EXPENSE, {
        input: { groupId, expenseId: id },
      });

      expect(edit.body.errors[0].extensions.code).toBe(
        'ExpenseAccessDeniedException',
      );
      expect(del.body.errors[0].extensions.code).toBe(
        'ExpenseAccessDeniedException',
      );
    });
  });

  describe('history and isolation', () => {
    it('orders by date descending with the deleted expense flagged', async () => {
      const groupId = await createCouple();
      const older = await createdId('user_A', groupId, {
        amountCents: 100,
        spentOn: '2026-01-10',
      });
      await createdId('user_A', groupId, {
        amountCents: 200,
        spentOn: '2026-02-10',
      });
      await call('user_B', DELETE_EXPENSE, {
        input: { groupId, expenseId: older },
      });

      const items = (await list('user_B', groupId)).body.data.expenses.items;

      expect(items.map((i: { amountCents: number }) => i.amountCents)).toEqual([
        200, 100,
      ]);
      expect(
        items.map((i: { deletedAt: unknown }) => i.deletedAt !== null),
      ).toEqual([false, true]);
    });

    it('filters, sorts and paginates through the typed criteria', async () => {
      const groupId = await createCouple();
      await createdId('user_A', groupId, {
        amountCents: 100,
        category: 'FOOD',
      });
      await createdId('user_A', groupId, {
        amountCents: 300,
        category: 'HOME',
      });
      await createdId('user_A', groupId, {
        amountCents: 200,
        category: 'FOOD',
      });

      const res = await list('user_A', groupId, {
        filters: [{ field: 'CATEGORY', operator: 'EQUALS', value: 'food' }],
        sorts: [{ field: 'AMOUNT_CENTS', direction: 'ASC' }],
        pagination: { page: 1, perPage: 1 },
      });

      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.expenses.total).toBe(2);
      expect(res.body.data.expenses.totalPages).toBe(2);
      expect(res.body.data.expenses.items).toHaveLength(1);
      expect(res.body.data.expenses.items[0].amountCents).toBe(100);
    });

    it('rejects a filter value outside the category enum', async () => {
      const groupId = await createCouple();

      const res = await list('user_A', groupId, {
        filters: [{ field: 'CATEGORY', operator: 'EQUALS', value: 'pets' }],
      });

      expect(res.body.errors).toHaveLength(1);
    });

    it('does not let a filter on the group field widen the scope', async () => {
      const groupId = await createCouple();
      await createdId('user_A', groupId);

      const res = await list('user_A', groupId, {
        filters: [{ field: 'GROUP_ID', operator: 'EQUALS', value: 'x' }],
      });

      expect(res.body.errors).toHaveLength(1);
    });

    it('keeps expenses of different groups apart', async () => {
      const groupOne = await createCouple();
      await createdId('user_A', groupOne, { amountCents: 111 });

      const groupTwo = await createGroup('user_C');
      const code = (
        await call('user_C', GENERATE, { input: { groupId: groupTwo } })
      ).body.data.generateInvitationCode.code;
      await call('user_D', REDEEM, { input: { code } });
      await createdId('user_C', groupTwo, {
        amountCents: 222,
        paidBy: 'user_C',
      });

      const one = (await list('user_A', groupOne)).body.data.expenses.items;
      const two = (await list('user_C', groupTwo)).body.data.expenses.items;

      expect(one.map((i: { amountCents: number }) => i.amountCents)).toEqual([
        111,
      ]);
      expect(two.map((i: { amountCents: number }) => i.amountCents)).toEqual([
        222,
      ]);
    });

    it('cannot edit an expense through another group', async () => {
      const groupOne = await createCouple();
      const id = await createdId('user_A', groupOne);
      const groupTwo = await createGroup('user_C');

      const res = await call('user_C', EDIT_EXPENSE, {
        input: { groupId: groupTwo, expenseId: id, amountCents: 5 },
      });

      expect(res.body.errors[0].extensions.code).toBe(
        'ExpenseNotFoundException',
      );
    });

    it('denies a non-member listing or creating', async () => {
      const groupId = await createCouple();

      const listed = await list('user_X', groupId);
      const created = await createExpense('user_X', groupId);

      expect(listed.body.errors[0].extensions.code).toBe(
        'ExpenseAccessDeniedException',
      );
      expect(created.body.errors[0].extensions.code).toBe(
        'ExpenseAccessDeniedException',
      );
    });

    it('rejects unauthenticated calls', async () => {
      const groupId = await createCouple();

      const listed = await call(null, EXPENSES, { groupId });
      const created = await call(null, CREATE_EXPENSE, {
        input: {
          groupId,
          amountCents: 1,
          paidBy: 'user_A',
          spentOn: '2026-03-01',
        },
      });

      expect(listed.body.errors).toHaveLength(1);
      expect(created.body.errors).toHaveLength(1);
    });
  });
});
