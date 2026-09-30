import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  Criteria,
  Filter,
  FilterOperator,
  PaginatedResult,
  Sort,
  SortDirection,
} from '@sisques-labs/nestjs-kit';

import { CreateExpenseCommand } from '../../../src/contexts/expenses/application/commands/create-expense/create-expense.command';
import { DeleteExpenseCommand } from '../../../src/contexts/expenses/application/commands/delete-expense/delete-expense.command';
import { EditExpenseCommand } from '../../../src/contexts/expenses/application/commands/edit-expense/edit-expense.command';
import { ExpensesFindActiveByGroupQuery } from '../../../src/contexts/expenses/application/queries/expenses-find-active-by-group/expenses-find-active-by-group.query';
import { ExpensesFindByCriteriaQuery } from '../../../src/contexts/expenses/application/queries/expenses-find-by-criteria/expenses-find-by-criteria.query';
import { ExpenseAccessDeniedException } from '../../../src/contexts/expenses/domain/exceptions/expense-access-denied.exception';
import { ExpenseAlreadyDeletedException } from '../../../src/contexts/expenses/domain/exceptions/expense-already-deleted.exception';
import { ExpensePayerNotMemberException } from '../../../src/contexts/expenses/domain/exceptions/expense-payer-not-member.exception';
import { GroupNotReadyException } from '../../../src/contexts/expenses/domain/exceptions/group-not-ready.exception';
import {
  EXPENSE_READ_REPOSITORY,
  ExpenseReadRepository,
} from '../../../src/contexts/expenses/domain/repositories/read/expense-read.repository';
import { ExpenseViewModel } from '../../../src/contexts/expenses/domain/view-models/expense.view-model';
import { ExpensesModule } from '../../../src/contexts/expenses/expenses.module';
import { GenerateInvitationCodeCommand } from '../../../src/contexts/group-invitation-codes/application/commands/generate-invitation-code/generate-invitation-code.command';
import { RedeemInvitationCodeCommand } from '../../../src/contexts/group-invitation-codes/application/commands/redeem-invitation-code/redeem-invitation-code.command';
import { GroupInvitationCodesModule } from '../../../src/contexts/group-invitation-codes/group-invitation-codes.module';
import { GroupMembersModule } from '../../../src/contexts/group-members/group-members.module';
import { CreateGroupCommand } from '../../../src/contexts/groups/application/commands/create-group/create-group.command';
import { GroupsModule } from '../../../src/contexts/groups/groups.module';
import { truncateAll } from '../../helpers/db-reset';
import {
  createIntegrationModule,
  IntegrationContext,
} from '../../helpers/integration-bootstrap';

interface Seed {
  amountCents: number;
  paidBy: string;
  spentOn: string;
  category?: string;
  splitType?: string;
}

describe('expenses persistence and adapters (integration)', () => {
  let ctx: IntegrationContext;
  let commands: CommandBus;
  let queries: QueryBus;
  let readRepository: ExpenseReadRepository;

  beforeAll(async () => {
    ctx = await createIntegrationModule({
      imports: [
        GroupMembersModule,
        GroupsModule,
        GroupInvitationCodesModule,
        ExpensesModule,
      ],
    });
    commands = ctx.module.get(CommandBus);
    queries = ctx.module.get(QueryBus);
    readRepository = ctx.module.get(EXPENSE_READ_REPOSITORY);
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
      new CreateExpenseCommand({ groupId, requesterId, ...seed }),
    );

  const history = (
    groupId: string,
    requesterId: string,
    filters: Filter[] = [],
    sorts: Sort[] = [],
    pagination = { page: 1, perPage: 50 },
  ): Promise<PaginatedResult<ExpenseViewModel>> =>
    queries.execute(
      new ExpensesFindByCriteriaQuery({
        groupId,
        requesterId,
        criteria: new Criteria(filters, sorts, pagination),
      }),
    );

  const amounts = (page: PaginatedResult<ExpenseViewModel>): number[] =>
    page.items.map((item) => item.amountCents);

  const rawRow = async (id: string) =>
    (
      await ctx.dataSource.query(
        `SELECT amount_cents, currency, paid_by, spent_on::text AS spent_on,
                description, category, split_type, created_by, updated_by, deleted_at
           FROM expenses WHERE id = $1`,
        [id],
      )
    )[0];

  it('persists an expense with its defaults and a date-only spent_on', async () => {
    const groupId = await createCouple();

    const id = await create(groupId, 'alice', {
      amountCents: 1234,
      paidBy: 'bob',
      spentOn: '2026-02-28',
    });

    await expect(rawRow(id)).resolves.toEqual({
      amount_cents: 1234,
      currency: 'EUR',
      paid_by: 'bob',
      spent_on: '2026-02-28',
      description: null,
      category: null,
      split_type: 'EQUAL',
      created_by: 'alice',
      updated_by: 'alice',
      deleted_at: null,
    });
  });

  it('stores category, split type and description when given', async () => {
    const groupId = await createCouple();

    const id = await create(groupId, 'alice', {
      amountCents: 500,
      paidBy: 'alice',
      spentOn: '2026-02-01',
      category: 'food',
      splitType: 'OTHER_OWES_ALL',
    });

    const row = await rawRow(id);
    expect(row.category).toBe('food');
    expect(row.split_type).toBe('OTHER_OWES_ALL');
  });

  it('rejects an expense in a group with fewer than two members', async () => {
    const groupId = await createGroup('alice');

    await expect(
      create(groupId, 'alice', {
        amountCents: 100,
        paidBy: 'alice',
        spentOn: '2026-02-01',
      }),
    ).rejects.toThrow(GroupNotReadyException);
    await expect(
      ctx.dataSource.query('SELECT count(*)::int AS n FROM expenses'),
    ).resolves.toEqual([{ n: 0 }]);
  });

  it('rejects a payer who is not a member and a requester who is not one', async () => {
    const groupId = await createCouple();

    await expect(
      create(groupId, 'alice', {
        amountCents: 100,
        paidBy: 'mallory',
        spentOn: '2026-02-01',
      }),
    ).rejects.toThrow(ExpensePayerNotMemberException);
    await expect(
      create(groupId, 'mallory', {
        amountCents: 100,
        paidBy: 'alice',
        spentOn: '2026-02-01',
      }),
    ).rejects.toThrow(ExpenseAccessDeniedException);
  });

  it('lets the other member edit an expense and records the editor', async () => {
    const groupId = await createCouple();
    const id = await create(groupId, 'alice', {
      amountCents: 1000,
      paidBy: 'alice',
      spentOn: '2026-02-01',
    });

    await commands.execute(
      new EditExpenseCommand({
        expenseId: id,
        groupId,
        requesterId: 'bob',
        amountCents: 1500,
        category: 'home',
      }),
    );

    const row = await rawRow(id);
    expect(row.amount_cents).toBe(1500);
    expect(row.category).toBe('home');
    expect(row.created_by).toBe('alice');
    expect(row.updated_by).toBe('bob');
  });

  it('soft-deletes for any member, keeps the row and rejects a later edit', async () => {
    const groupId = await createCouple();
    const id = await create(groupId, 'alice', {
      amountCents: 1000,
      paidBy: 'alice',
      spentOn: '2026-02-01',
    });

    await commands.execute(
      new DeleteExpenseCommand({ expenseId: id, groupId, requesterId: 'bob' }),
    );

    const row = await rawRow(id);
    expect(row.deleted_at).toBeInstanceOf(Date);
    expect(row.updated_by).toBe('bob');
    await expect(
      commands.execute(
        new EditExpenseCommand({
          expenseId: id,
          groupId,
          requesterId: 'alice',
          amountCents: 1,
        }),
      ),
    ).rejects.toThrow(ExpenseAlreadyDeletedException);
  });

  describe('database constraints', () => {
    const insert = (amount: number, category: string | null, split = 'EQUAL') =>
      ctx.dataSource.query(
        `INSERT INTO expenses (id, group_id, amount_cents, currency, paid_by, spent_on,
                               category, split_type, created_by, updated_by, created_at, updated_at)
         VALUES (gen_random_uuid(), gen_random_uuid(), $1, 'EUR', 'a', '2026-01-01',
                 $2, $3, 'a', 'a', now(), now())`,
        [amount, category, split],
      );

    it('accepts a valid row', async () => {
      await expect(insert(1, 'other')).resolves.toBeDefined();
    });

    it.each([0, -5])('rejects amount_cents = %i', async (amount) => {
      await expect(insert(amount, null)).rejects.toThrow(
        /ck_expenses_amount_positive/,
      );
    });

    it('rejects a category outside the nine values', async () => {
      await expect(insert(100, 'pets')).rejects.toThrow(/ck_expenses_category/);
    });

    it('rejects an unknown split type', async () => {
      await expect(insert(100, null, 'THIRDS')).rejects.toThrow(
        /ck_expenses_split_type/,
      );
    });

    it('creates the (group_id, deleted_at) index and no foreign key', async () => {
      const indexes = await ctx.dataSource.query(
        `SELECT indexdef FROM pg_indexes WHERE indexname = 'idx_expenses_group_deleted'`,
      );
      expect(indexes[0].indexdef).toContain('(group_id, deleted_at)');
      await expect(
        ctx.dataSource.query(
          `SELECT count(*)::int AS n FROM information_schema.table_constraints
            WHERE table_name = 'expenses' AND constraint_type = 'FOREIGN KEY'`,
        ),
      ).resolves.toEqual([{ n: 0 }]);
    });
  });

  describe('history (findByCriteria)', () => {
    let groupId: string;

    beforeEach(async () => {
      groupId = await createCouple();
      await create(groupId, 'alice', {
        amountCents: 1000,
        paidBy: 'alice',
        spentOn: '2026-01-10',
        category: 'food',
      });
      await create(groupId, 'bob', {
        amountCents: 2500,
        paidBy: 'bob',
        spentOn: '2026-02-10',
        category: 'travel',
        splitType: 'OTHER_OWES_ALL',
      });
      const deletedId = await create(groupId, 'alice', {
        amountCents: 4000,
        paidBy: 'alice',
        spentOn: '2026-03-10',
      });
      await commands.execute(
        new DeleteExpenseCommand({
          expenseId: deletedId,
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
      expect(page.items[0].spentOn).toBe('2026-03-10');
      expect(page.total).toBe(3);
    });

    it('breaks date ties by newest creation', async () => {
      await create(groupId, 'alice', {
        amountCents: 111,
        paidBy: 'alice',
        spentOn: '2026-03-10',
      });
      await create(groupId, 'alice', {
        amountCents: 222,
        paidBy: 'alice',
        spentOn: '2026-03-10',
      });

      const page = await history(groupId, 'alice');

      expect(amounts(page).slice(0, 3)).toEqual([222, 111, 4000]);
    });

    it.each([
      ['EQUALS', filter('category', FilterOperator.EQUALS, 'food'), [1000]],
      [
        'NOT_EQUALS',
        filter('paidBy', FilterOperator.NOT_EQUALS, 'alice'),
        [2500],
      ],
      [
        'LIKE on text',
        filter('paidBy', FilterOperator.LIKE, 'lic'),
        [4000, 1000],
      ],
      [
        'LIKE on date',
        filter('spentOn', FilterOperator.LIKE, '2026-02'),
        [2500],
      ],
      [
        'IN',
        filter('category', FilterOperator.IN, ['food', 'travel']),
        [2500, 1000],
      ],
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
        'date comparison',
        filter('spentOn', FilterOperator.GREATER_THAN_OR_EQUAL, '2026-02-10'),
        [4000, 2500],
      ],
      [
        'split type',
        filter('splitType', FilterOperator.EQUALS, 'OTHER_OWES_ALL'),
        [2500],
      ],
      [
        'deleted rows only',
        filter('deletedAt', FilterOperator.GREATER_THAN, '2000-01-01'),
        [4000],
      ],
    ])('translates the %s operator', async (_name, expenseFilter, expected) => {
      const page = await history(groupId, 'alice', [expenseFilter]);

      expect(amounts(page)).toEqual(expected);
      expect(page.total).toBe(expected.length);
    });

    it('honours client sorts over the default order', async () => {
      const page = await history(
        groupId,
        'alice',
        [],
        [{ field: 'amountCents', direction: SortDirection.ASC }],
      );

      expect(amounts(page)).toEqual([1000, 2500, 4000]);
    });

    it('paginates and reports the total', async () => {
      const second = await history(groupId, 'alice', [], [], {
        page: 2,
        perPage: 2,
      });

      expect(amounts(second)).toEqual([1000]);
      expect(second.total).toBe(3);
      expect(second.totalPages).toBe(2);
    });

    it('never leaks another group and ignores a client group filter', async () => {
      const otherGroup = await createGroup('carol');
      await ctx.dataSource.query(
        `INSERT INTO expenses (id, group_id, amount_cents, currency, paid_by, spent_on,
                               split_type, created_by, updated_by, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, 9999, 'EUR', 'carol', '2026-01-01',
                 'EQUAL', 'carol', 'carol', now(), now())`,
        [otherGroup],
      );

      const page = await history(groupId, 'alice', [
        filter('groupId', FilterOperator.EQUALS, otherGroup),
      ]);

      expect(amounts(page)).toEqual([4000, 2500, 1000]);
    });

    it('denies a requester who is not a member', async () => {
      await expect(history(groupId, 'mallory')).rejects.toThrow(
        ExpenseAccessDeniedException,
      );
    });

    it('rejects a field outside the whitelist at the repository', async () => {
      await expect(
        readRepository.findByCriteria(
          new Criteria([
            filter(
              'description; DROP TABLE expenses',
              FilterOperator.EQUALS,
              'x',
            ),
          ]),
        ),
      ).rejects.toThrow(/not queryable/);
    });

    it('returns only active expenses of the group for other contexts', async () => {
      const active: ExpenseViewModel[] = await queries.execute(
        new ExpensesFindActiveByGroupQuery({ groupId }),
      );

      expect(active.map((item) => item.amountCents).sort()).toEqual([
        1000, 2500,
      ]);
      expect(active.every((item) => item.groupId === groupId)).toBe(true);
    });
  });
});
