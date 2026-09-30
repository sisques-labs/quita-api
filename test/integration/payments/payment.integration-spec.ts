import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  Criteria,
  Filter,
  FilterOperator,
  PaginatedResult,
  Sort,
  SortDirection,
} from '@sisques-labs/nestjs-kit';

import { GenerateInvitationCodeCommand } from '../../../src/contexts/group-invitation-codes/application/commands/generate-invitation-code/generate-invitation-code.command';
import { RedeemInvitationCodeCommand } from '../../../src/contexts/group-invitation-codes/application/commands/redeem-invitation-code/redeem-invitation-code.command';
import { GroupInvitationCodesModule } from '../../../src/contexts/group-invitation-codes/group-invitation-codes.module';
import { GroupMembersModule } from '../../../src/contexts/group-members/group-members.module';
import { CreateGroupCommand } from '../../../src/contexts/groups/application/commands/create-group/create-group.command';
import { GroupsModule } from '../../../src/contexts/groups/groups.module';
import { CreatePaymentCommand } from '../../../src/contexts/payments/application/commands/create-payment/create-payment.command';
import { DeletePaymentCommand } from '../../../src/contexts/payments/application/commands/delete-payment/delete-payment.command';
import { EditPaymentCommand } from '../../../src/contexts/payments/application/commands/edit-payment/edit-payment.command';
import { PaymentsFindActiveByGroupQuery } from '../../../src/contexts/payments/application/queries/payments-find-active-by-group/payments-find-active-by-group.query';
import { PaymentsFindByCriteriaQuery } from '../../../src/contexts/payments/application/queries/payments-find-by-criteria/payments-find-by-criteria.query';
import { PaymentAccessDeniedException } from '../../../src/contexts/payments/domain/exceptions/payment-access-denied.exception';
import { PaymentAlreadyDeletedException } from '../../../src/contexts/payments/domain/exceptions/payment-already-deleted.exception';
import { PaymentPartiesMustDifferException } from '../../../src/contexts/payments/domain/exceptions/payment-parties-must-differ.exception';
import { PaymentPartyNotMemberException } from '../../../src/contexts/payments/domain/exceptions/payment-party-not-member.exception';
import {
  PAYMENT_READ_REPOSITORY,
  PaymentReadRepository,
} from '../../../src/contexts/payments/domain/repositories/read/payment-read.repository';
import { PaymentViewModel } from '../../../src/contexts/payments/domain/view-models/payment.view-model';
import { PaymentsModule } from '../../../src/contexts/payments/payments.module';
import { truncateAll } from '../../helpers/db-reset';
import {
  createIntegrationModule,
  IntegrationContext,
} from '../../helpers/integration-bootstrap';

interface Seed {
  fromUserId: string;
  toUserId: string;
  amountCents: number;
  paidOn: string;
  note?: string;
}

describe('payments persistence and adapters (integration)', () => {
  let ctx: IntegrationContext;
  let commands: CommandBus;
  let queries: QueryBus;
  let readRepository: PaymentReadRepository;

  beforeAll(async () => {
    ctx = await createIntegrationModule({
      imports: [
        GroupMembersModule,
        GroupsModule,
        GroupInvitationCodesModule,
        PaymentsModule,
      ],
    });
    commands = ctx.module.get(CommandBus);
    queries = ctx.module.get(QueryBus);
    readRepository = ctx.module.get(PAYMENT_READ_REPOSITORY);
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

  const create = (
    groupId: string,
    requesterId: string,
    seed: Seed,
  ): Promise<string> =>
    commands.execute(
      new CreatePaymentCommand({ groupId, requesterId, ...seed }),
    );

  const history = (
    groupId: string,
    requesterId: string,
    filters: Filter[] = [],
    sorts: Sort[] = [],
    pagination = { page: 1, perPage: 50 },
  ): Promise<PaginatedResult<PaymentViewModel>> =>
    queries.execute(
      new PaymentsFindByCriteriaQuery({
        groupId,
        requesterId,
        criteria: new Criteria(filters, sorts, pagination),
      }),
    );

  const amounts = (page: PaginatedResult<PaymentViewModel>): number[] =>
    page.items.map((item) => item.amountCents);

  const rawRow = async (id: string) =>
    (
      await ctx.dataSource.query(
        `SELECT from_user_id, to_user_id, amount_cents, currency, paid_on::text AS paid_on,
                note, created_by, updated_by, deleted_at
           FROM payments WHERE id = $1`,
        [id],
      )
    )[0];

  it('persists a payment with its defaults and a date-only paid_on', async () => {
    const groupId = await createCouple();

    const id = await create(groupId, 'alice', {
      fromUserId: 'bob',
      toUserId: 'alice',
      amountCents: 1234,
      paidOn: '2026-02-28',
    });

    await expect(rawRow(id)).resolves.toEqual({
      from_user_id: 'bob',
      to_user_id: 'alice',
      amount_cents: 1234,
      currency: 'EUR',
      paid_on: '2026-02-28',
      note: null,
      created_by: 'alice',
      updated_by: 'alice',
      deleted_at: null,
    });
  });

  it('rejects non-member parties, a self payment and a non-member requester', async () => {
    const groupId = await createCouple();
    const seed = {
      fromUserId: 'alice',
      toUserId: 'bob',
      amountCents: 100,
      paidOn: '2026-02-01',
    };

    await expect(
      create(groupId, 'alice', { ...seed, toUserId: 'mallory' }),
    ).rejects.toThrow(PaymentPartyNotMemberException);
    await expect(
      create(groupId, 'alice', { ...seed, toUserId: 'alice' }),
    ).rejects.toThrow(PaymentPartiesMustDifferException);
    await expect(create(groupId, 'mallory', seed)).rejects.toThrow(
      PaymentAccessDeniedException,
    );
    await expect(
      ctx.dataSource.query('SELECT count(*)::int AS n FROM payments'),
    ).resolves.toEqual([{ n: 0 }]);
  });

  it('lets the other member edit a payment and records the editor', async () => {
    const groupId = await createCouple();
    const id = await create(groupId, 'alice', {
      fromUserId: 'alice',
      toUserId: 'bob',
      amountCents: 1000,
      paidOn: '2026-02-01',
    });

    await commands.execute(
      new EditPaymentCommand({
        paymentId: id,
        groupId,
        requesterId: 'bob',
        amountCents: 1500,
        note: 'Rent',
      }),
    );

    const row = await rawRow(id);
    expect(row).toMatchObject({
      amount_cents: 1500,
      note: 'Rent',
      created_by: 'alice',
      updated_by: 'bob',
    });
  });

  it('soft-deletes for any member, keeps the row and rejects a later edit', async () => {
    const groupId = await createCouple();
    const id = await create(groupId, 'alice', {
      fromUserId: 'alice',
      toUserId: 'bob',
      amountCents: 1000,
      paidOn: '2026-02-01',
    });

    await commands.execute(
      new DeletePaymentCommand({ paymentId: id, groupId, requesterId: 'bob' }),
    );

    const row = await rawRow(id);
    expect(row.deleted_at).toBeInstanceOf(Date);
    expect(row.updated_by).toBe('bob');
    await expect(
      commands.execute(
        new EditPaymentCommand({
          paymentId: id,
          groupId,
          requesterId: 'alice',
          amountCents: 1,
        }),
      ),
    ).rejects.toThrow(PaymentAlreadyDeletedException);
  });

  describe('database constraints and index', () => {
    const insert = (amount: number, from: string, to: string) =>
      ctx.dataSource.query(
        `INSERT INTO payments (id, group_id, from_user_id, to_user_id, amount_cents, currency,
                               paid_on, created_by, updated_by, created_at, updated_at)
         VALUES (gen_random_uuid(), gen_random_uuid(), $2, $3, $1, 'EUR', '2026-01-01',
                 'a', 'a', now(), now())`,
        [amount, from, to],
      );

    it('accepts a valid row', async () => {
      await expect(insert(1, 'a', 'b')).resolves.toBeDefined();
    });

    it.each([0, -5])('rejects amount_cents = %i', async (amount) => {
      await expect(insert(amount, 'a', 'b')).rejects.toThrow(
        /ck_payments_amount_positive/,
      );
    });

    it('rejects a payment from a user to themselves', async () => {
      await expect(insert(100, 'a', 'a')).rejects.toThrow(
        /ck_payments_parties_differ/,
      );
    });

    it('creates the (group_id, deleted_at) index and no foreign key', async () => {
      const indexes = await ctx.dataSource.query(
        `SELECT indexdef FROM pg_indexes WHERE indexname = 'idx_payments_group_deleted'`,
      );
      expect(indexes[0].indexdef).toContain('(group_id, deleted_at)');
      await expect(
        ctx.dataSource.query(
          `SELECT count(*)::int AS n FROM information_schema.table_constraints
            WHERE table_name = 'payments' AND constraint_type = 'FOREIGN KEY'`,
        ),
      ).resolves.toEqual([{ n: 0 }]);
    });
  });

  describe('history (findByCriteria)', () => {
    let groupId: string;

    beforeEach(async () => {
      groupId = await createCouple();
      await create(groupId, 'alice', {
        fromUserId: 'alice',
        toUserId: 'bob',
        amountCents: 1000,
        paidOn: '2026-01-10',
      });
      await create(groupId, 'bob', {
        fromUserId: 'bob',
        toUserId: 'alice',
        amountCents: 2500,
        paidOn: '2026-02-10',
      });
      const deletedId = await create(groupId, 'alice', {
        fromUserId: 'alice',
        toUserId: 'bob',
        amountCents: 4000,
        paidOn: '2026-03-10',
      });
      await commands.execute(
        new DeletePaymentCommand({
          paymentId: deletedId,
          groupId,
          requesterId: 'bob',
        }),
      );
    });

    const filter = (
      field: string,
      operator: FilterOperator,
      value: unknown,
    ): Filter => ({ field, operator, value });

    it('orders by date descending and includes the soft-deleted row flagged', async () => {
      const page = await history(groupId, 'alice');

      expect(amounts(page)).toEqual([4000, 2500, 1000]);
      expect(page.items.map((item) => item.deletedAt !== null)).toEqual([
        true,
        false,
        false,
      ]);
      expect(page.items[0].paidOn).toBe('2026-03-10');
    });

    it('breaks date ties by newest creation', async () => {
      await create(groupId, 'alice', {
        fromUserId: 'alice',
        toUserId: 'bob',
        amountCents: 111,
        paidOn: '2026-03-10',
      });
      await create(groupId, 'alice', {
        fromUserId: 'alice',
        toUserId: 'bob',
        amountCents: 222,
        paidOn: '2026-03-10',
      });

      expect(amounts(await history(groupId, 'alice')).slice(0, 3)).toEqual([
        222, 111, 4000,
      ]);
    });

    it.each([
      ['EQUALS', filter('toUserId', FilterOperator.EQUALS, 'alice'), [2500]],
      [
        'NOT_EQUALS',
        filter('fromUserId', FilterOperator.NOT_EQUALS, 'alice'),
        [2500],
      ],
      [
        'LIKE on text',
        filter('fromUserId', FilterOperator.LIKE, 'lic'),
        [4000, 1000],
      ],
      [
        'LIKE on date',
        filter('paidOn', FilterOperator.LIKE, '2026-02'),
        [2500],
      ],
      ['IN', filter('fromUserId', FilterOperator.IN, ['bob']), [2500]],
      [
        'GREATER_THAN',
        filter('amountCents', FilterOperator.GREATER_THAN, 1000),
        [4000, 2500],
      ],
      [
        'GREATER_THAN_OR_EQUAL',
        filter('amountCents', FilterOperator.GREATER_THAN_OR_EQUAL, 2500),
        [4000, 2500],
      ],
      [
        'LESS_THAN',
        filter('amountCents', FilterOperator.LESS_THAN, 2500),
        [1000],
      ],
      [
        'LESS_THAN_OR_EQUAL',
        filter('amountCents', FilterOperator.LESS_THAN_OR_EQUAL, 2500),
        [2500, 1000],
      ],
      [
        'deleted rows only',
        filter('deletedAt', FilterOperator.GREATER_THAN, '2000-01-01'),
        [4000],
      ],
    ])('translates the %s operator', async (_name, paymentFilter, expected) => {
      const page = await history(groupId, 'alice', [paymentFilter]);

      expect(amounts(page)).toEqual(expected);
      expect(page.total).toBe(expected.length);
    });

    it('honours client sorts and paginates with the total', async () => {
      const sorted = await history(
        groupId,
        'alice',
        [],
        [{ field: 'amountCents', direction: SortDirection.ASC }],
        { page: 2, perPage: 2 },
      );

      expect(amounts(sorted)).toEqual([4000]);
      expect(sorted.total).toBe(3);
      expect(sorted.totalPages).toBe(2);
    });

    it('never leaks another group and ignores a client group filter', async () => {
      const otherGroup = await createGroup('carol');
      await ctx.dataSource.query(
        `INSERT INTO payments (id, group_id, from_user_id, to_user_id, amount_cents, currency,
                               paid_on, created_by, updated_by, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, 'carol', 'dave', 9999, 'EUR', '2026-01-01',
                 'carol', 'carol', now(), now())`,
        [otherGroup],
      );

      const page = await history(groupId, 'alice', [
        filter('groupId', FilterOperator.EQUALS, otherGroup),
      ]);

      expect(amounts(page)).toEqual([4000, 2500, 1000]);
      await expect(history(groupId, 'mallory')).rejects.toThrow(
        PaymentAccessDeniedException,
      );
    });

    it('rejects a field outside the whitelist at the repository', async () => {
      await expect(
        readRepository.findByCriteria(
          new Criteria([
            filter('note; DROP TABLE payments', FilterOperator.EQUALS, 'x'),
          ]),
        ),
      ).rejects.toThrow(/not queryable/);
    });

    it('returns only active payments of the group for other contexts', async () => {
      const active: PaymentViewModel[] = await queries.execute(
        new PaymentsFindActiveByGroupQuery({ groupId }),
      );

      expect(active.map((item) => item.amountCents).sort()).toEqual([
        1000, 2500,
      ]);
      expect(active.every((item) => item.groupId === groupId)).toBe(true);
    });
  });
});
