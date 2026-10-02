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
const CREATE_PAYMENT = `
  mutation CreatePayment($input: PaymentCreateRequestDto!) {
    createPayment(input: $input) { success message id }
  }
`;
const EDIT_PAYMENT = `
  mutation EditPayment($input: PaymentEditRequestDto!) {
    editPayment(input: $input) { success id }
  }
`;
const DELETE_PAYMENT = `
  mutation DeletePayment($input: PaymentDeleteRequestDto!) {
    deletePayment(input: $input) { success id }
  }
`;
const PAYMENTS = `
  query Payments($groupId: ID!, $criteria: PaymentsFindByCriteriaRequestDto) {
    payments(groupId: $groupId, criteria: $criteria) {
      total page perPage totalPages
      items {
        id groupId fromUserId toUserId amountCents currency paidOn note
        createdBy updatedBy deletedAt
      }
    }
  }
`;

describe('Payments (e2e)', () => {
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

  const createPayment = async (
    sub: string,
    groupId: string,
    fields: Record<string, unknown> = {},
  ) =>
    call(sub, CREATE_PAYMENT, {
      input: {
        groupId,
        fromUserId: 'user_A',
        toUserId: 'user_B',
        amountCents: 1000,
        paidOn: '2026-03-01',
        ...fields,
      },
    });

  const createdId = async (
    sub: string,
    groupId: string,
    fields: Record<string, unknown> = {},
  ): Promise<string> => {
    const res = await createPayment(sub, groupId, fields);
    expect(res.body.errors).toBeUndefined();
    return res.body.data.createPayment.id;
  };

  const list = async (
    sub: string,
    groupId: string,
    criteria?: Record<string, unknown>,
  ) => call(sub, PAYMENTS, { groupId, criteria });

  const code = (res: {
    body: { errors: { extensions: { code: string } }[] };
  }) => res.body.errors[0].extensions.code;

  it('records a payment between the two members and lists it', async () => {
    const groupId = await createCouple();

    const res = await createPayment('user_B', groupId, { note: 'Rent' });
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.createPayment).toMatchObject({
      success: true,
      message: 'Payment created successfully',
    });

    const history = await list('user_A', groupId);
    expect(history.body.data.payments.total).toBe(1);
    expect(history.body.data.payments.items[0]).toMatchObject({
      id: res.body.data.createPayment.id,
      groupId,
      fromUserId: 'user_A',
      toUserId: 'user_B',
      amountCents: 1000,
      currency: 'EUR',
      paidOn: '2026-03-01',
      note: 'Rent',
      createdBy: 'user_B',
      updatedBy: 'user_B',
      deletedAt: null,
    });
  });

  it('rejects invalid amounts, equal parties and non-member parties', async () => {
    const groupId = await createCouple();

    for (const amountCents of [0, -5, 10.5]) {
      const res = await createPayment('user_A', groupId, { amountCents });
      expect(res.body.errors).toHaveLength(1);
    }
    const same = await createPayment('user_A', groupId, { toUserId: 'user_A' });
    expect(code(same)).toBe('PaymentPartiesMustDifferException');
    const stranger = await createPayment('user_A', groupId, {
      toUserId: 'user_X',
    });
    expect(code(stranger)).toBe('PaymentPartyNotMemberException');

    expect((await list('user_A', groupId)).body.data.payments.total).toBe(0);
  });

  describe('date not in the future (clock pinned to 2026-03-15)', () => {
    it('accepts today and yesterday', async () => {
      const groupId = await createCouple();

      const today = await createPayment('user_A', groupId, { paidOn: TODAY });
      const yesterday = await createPayment('user_A', groupId, {
        paidOn: '2026-03-14',
      });

      expect(today.body.errors).toBeUndefined();
      expect(yesterday.body.errors).toBeUndefined();
    });

    it('rejects tomorrow on create', async () => {
      const groupId = await createCouple();

      const res = await createPayment('user_A', groupId, {
        paidOn: '2026-03-16',
      });

      expect(code(res)).toBe('PaymentDateInFutureException');
      expect((await list('user_A', groupId)).body.data.payments.total).toBe(0);
    });

    it('rejects a future date on edit and keeps the stored date', async () => {
      const groupId = await createCouple();
      const id = await createdId('user_A', groupId);

      const res = await call('user_B', EDIT_PAYMENT, {
        input: { groupId, paymentId: id, paidOn: '2026-03-16' },
      });

      expect(code(res)).toBe('PaymentDateInFutureException');
      const item = (await list('user_A', groupId)).body.data.payments.items[0];
      expect(item.paidOn).toBe('2026-03-01');
    });
  });

  describe('edit and delete by any member', () => {
    it('lets the other member edit and records who did', async () => {
      const groupId = await createCouple();
      const id = await createdId('user_A', groupId, { note: 'Rent' });

      const res = await call('user_B', EDIT_PAYMENT, {
        input: { groupId, paymentId: id, amountCents: 2500, note: null },
      });

      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.editPayment).toEqual({ success: true, id });
      const item = (await list('user_A', groupId)).body.data.payments.items[0];
      expect(item).toMatchObject({
        amountCents: 2500,
        note: null,
        createdBy: 'user_A',
        updatedBy: 'user_B',
      });
    });

    it('lets the other member soft-delete, keeps the row, and blocks later changes', async () => {
      const groupId = await createCouple();
      const id = await createdId('user_A', groupId);

      const res = await call('user_B', DELETE_PAYMENT, {
        input: { groupId, paymentId: id },
      });
      expect(res.body.errors).toBeUndefined();

      const history = await list('user_A', groupId);
      expect(history.body.data.payments.total).toBe(1);
      expect(history.body.data.payments.items[0].deletedAt).not.toBeNull();

      const edit = await call('user_A', EDIT_PAYMENT, {
        input: { groupId, paymentId: id, amountCents: 5 },
      });
      const again = await call('user_A', DELETE_PAYMENT, {
        input: { groupId, paymentId: id },
      });
      expect(code(edit)).toBe('PaymentAlreadyDeletedException');
      expect(code(again)).toBe('PaymentAlreadyDeletedException');
    });

    it('denies a non-member edit, delete, list and create', async () => {
      const groupId = await createCouple();
      const id = await createdId('user_A', groupId);

      const edit = await call('user_X', EDIT_PAYMENT, {
        input: { groupId, paymentId: id, amountCents: 5 },
      });
      const del = await call('user_X', DELETE_PAYMENT, {
        input: { groupId, paymentId: id },
      });
      const listed = await list('user_X', groupId);
      const created = await createPayment('user_X', groupId);

      for (const res of [edit, del, listed, created]) {
        expect(code(res)).toBe('PaymentAccessDeniedException');
      }
    });
  });

  describe('history and isolation', () => {
    it('orders by date descending with the deleted payment flagged', async () => {
      const groupId = await createCouple();
      const older = await createdId('user_A', groupId, {
        amountCents: 100,
        paidOn: '2026-01-10',
      });
      await createdId('user_A', groupId, {
        amountCents: 200,
        paidOn: '2026-02-10',
      });
      await call('user_B', DELETE_PAYMENT, {
        input: { groupId, paymentId: older },
      });

      const items = (await list('user_B', groupId)).body.data.payments.items;

      expect(items.map((i: { amountCents: number }) => i.amountCents)).toEqual([
        200, 100,
      ]);
      expect(
        items.map((i: { deletedAt: unknown }) => i.deletedAt !== null),
      ).toEqual([false, true]);
    });

    it('filters, sorts and paginates through the typed criteria', async () => {
      const groupId = await createCouple();
      await createdId('user_A', groupId, { amountCents: 100 });
      await createdId('user_B', groupId, {
        amountCents: 300,
        fromUserId: 'user_B',
        toUserId: 'user_A',
      });
      await createdId('user_A', groupId, { amountCents: 200 });

      const res = await list('user_A', groupId, {
        filters: [
          { field: 'FROM_USER_ID', operator: 'EQUALS', value: 'user_A' },
        ],
        sorts: [{ field: 'AMOUNT_CENTS', direction: 'ASC' }],
        pagination: { page: 1, perPage: 1 },
      });

      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.payments.total).toBe(2);
      expect(res.body.data.payments.totalPages).toBe(2);
      expect(res.body.data.payments.items).toHaveLength(1);
      expect(res.body.data.payments.items[0].amountCents).toBe(100);
    });

    it('rejects a filter on the group field and a mistyped value', async () => {
      const groupId = await createCouple();

      const group = await list('user_A', groupId, {
        filters: [{ field: 'GROUP_ID', operator: 'EQUALS', value: 'x' }],
      });
      const mistyped = await list('user_A', groupId, {
        filters: [
          { field: 'AMOUNT_CENTS', operator: 'GREATER_THAN', value: 'many' },
        ],
      });

      expect(group.body.errors).toHaveLength(1);
      expect(mistyped.body.errors).toHaveLength(1);
    });

    it('keeps payments of different groups apart and hides them by id', async () => {
      const groupOne = await createCouple();
      const id = await createdId('user_A', groupOne, { amountCents: 111 });

      const groupTwo = await createGroup('user_C');
      const invite = (
        await call('user_C', GENERATE, { input: { groupId: groupTwo } })
      ).body.data.generateInvitationCode.code;
      await call('user_D', REDEEM, { input: { code: invite } });
      await createdId('user_C', groupTwo, {
        amountCents: 222,
        fromUserId: 'user_C',
        toUserId: 'user_D',
      });

      const one = (await list('user_A', groupOne)).body.data.payments.items;
      const two = (await list('user_C', groupTwo)).body.data.payments.items;
      expect(one.map((i: { amountCents: number }) => i.amountCents)).toEqual([
        111,
      ]);
      expect(two.map((i: { amountCents: number }) => i.amountCents)).toEqual([
        222,
      ]);

      const edit = await call('user_C', EDIT_PAYMENT, {
        input: { groupId: groupTwo, paymentId: id, amountCents: 5 },
      });
      expect(code(edit)).toBe('PaymentNotFoundException');
    });

    it('rejects unauthenticated calls', async () => {
      const groupId = await createCouple();

      const listed = await call(null, PAYMENTS, { groupId });
      const created = await call(null, CREATE_PAYMENT, {
        input: {
          groupId,
          fromUserId: 'user_A',
          toUserId: 'user_B',
          amountCents: 1,
          paidOn: '2026-03-01',
        },
      });

      expect(listed.body.errors).toHaveLength(1);
      expect(created.body.errors).toHaveLength(1);
    });
  });
});
