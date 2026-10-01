import { ExpensesFindByCriteriaHandler } from '@contexts/expenses/application/queries/expenses-find-by-criteria/expenses-find-by-criteria.handler';
import { ExpensesFindByCriteriaQuery } from '@contexts/expenses/application/queries/expenses-find-by-criteria/expenses-find-by-criteria.query';
import { AssertRequesterIsGroupMemberService } from '@contexts/expenses/application/services/read/assert-requester-is-group-member/assert-requester-is-group-member.service';
import { ExpenseBuilder } from '@contexts/expenses/domain/builders/expense.builder';
import { ExpenseAccessDeniedException } from '@contexts/expenses/domain/exceptions/expense-access-denied.exception';
import { IExpenseReadRepository } from '@contexts/expenses/domain/repositories/read/expense-read.repository';
import {
  Criteria,
  FilterOperator,
  PaginatedResult,
  SortDirection,
} from '@sisques-labs/nestjs-kit';
import { Mocked } from 'vitest';

const GROUP_ID = '5d1c8f0a-3f55-4b6a-8a27-3a8d3b0d7e22';
const OTHER_GROUP_ID = '9a7c2d10-1b2c-4d3e-8f40-5a6b7c8d9e00';

const viewModel = (id: string, spentOn: string, deletedAt: Date | null) =>
  new ExpenseBuilder()
    .withId(id)
    .withGroupId(GROUP_ID)
    .withAmountCents(100)
    .withPaidBy('user_a')
    .withSpentOn(spentOn)
    .withCreatedBy('user_a')
    .withDeletedAt(deletedAt)
    .buildViewModel();

describe('ExpensesFindByCriteriaHandler', () => {
  let repository: Mocked<IExpenseReadRepository>;
  let assertMember: Mocked<AssertRequesterIsGroupMemberService>;
  let handler: ExpensesFindByCriteriaHandler;

  const criteriaSent = (): Criteria =>
    repository.findByCriteria.mock.calls[0][0];

  beforeEach(() => {
    repository = { findByCriteria: vi.fn(), findActiveByGroupId: vi.fn() };
    assertMember = {
      execute: vi.fn(),
    } as unknown as Mocked<AssertRequesterIsGroupMemberService>;
    handler = new ExpensesFindByCriteriaHandler(assertMember, repository);
  });

  it('returns the page, including soft-deleted rows flagged by deletedAt', async () => {
    const active = viewModel(
      '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11',
      '2026-09-29',
      null,
    );
    const deleted = viewModel(
      '1c7a7c1f-7a1f-4e9b-9e1b-8e7f3a4b2d22',
      '2026-09-01',
      new Date('2026-09-10T08:00:00Z'),
    );
    const page = new PaginatedResult([active, deleted], 2, 1, 10);
    repository.findByCriteria.mockResolvedValue(page);

    const result = await handler.execute(
      new ExpensesFindByCriteriaQuery({
        groupId: GROUP_ID,
        requesterId: 'user_a',
      }),
    );

    expect(result).toBe(page);
    expect(result.items.map((e) => e.deletedAt === null)).toEqual([
      true,
      false,
    ]);
    expect(assertMember.execute).toHaveBeenCalledWith(
      expect.objectContaining({ value: GROUP_ID }),
      expect.objectContaining({ value: 'user_a' }),
    );
  });

  it('always scopes the query to the group with an equality filter', async () => {
    await handler.execute(
      new ExpensesFindByCriteriaQuery({
        groupId: GROUP_ID,
        requesterId: 'user_a',
        criteria: new Criteria([
          { field: 'paidBy', operator: FilterOperator.EQUALS, value: 'user_b' },
        ]),
      }),
    );

    expect(criteriaSent().filters).toEqual([
      { field: 'paidBy', operator: FilterOperator.EQUALS, value: 'user_b' },
      { field: 'groupId', operator: FilterOperator.EQUALS, value: GROUP_ID },
    ]);
  });

  it('discards a client filter on groupId so another group cannot be read', async () => {
    await handler.execute(
      new ExpensesFindByCriteriaQuery({
        groupId: GROUP_ID,
        requesterId: 'user_a',
        criteria: new Criteria([
          {
            field: 'groupId',
            operator: FilterOperator.EQUALS,
            value: OTHER_GROUP_ID,
          },
          {
            field: 'groupId',
            operator: FilterOperator.IN,
            value: [OTHER_GROUP_ID, GROUP_ID],
          },
        ]),
      }),
    );

    expect(criteriaSent().filters).toEqual([
      { field: 'groupId', operator: FilterOperator.EQUALS, value: GROUP_ID },
    ]);
  });

  it('orders by spentOn desc then createdAt desc when no sort is given', async () => {
    await handler.execute(
      new ExpensesFindByCriteriaQuery({
        groupId: GROUP_ID,
        requesterId: 'user_a',
      }),
    );

    expect(criteriaSent().sorts).toEqual([
      { field: 'spentOn', direction: SortDirection.DESC },
      { field: 'createdAt', direction: SortDirection.DESC },
    ]);
  });

  it('keeps the client sort and pagination when given', async () => {
    await handler.execute(
      new ExpensesFindByCriteriaQuery({
        groupId: GROUP_ID,
        requesterId: 'user_a',
        criteria: new Criteria(
          [],
          [{ field: 'amountCents', direction: SortDirection.ASC }],
          { page: 3, perPage: 5 },
        ),
      }),
    );

    expect(criteriaSent().sorts).toEqual([
      { field: 'amountCents', direction: SortDirection.ASC },
    ]);
    expect(criteriaSent().pagination).toEqual({ page: 3, perPage: 5 });
  });

  it('denies a non-member without touching the repository', async () => {
    assertMember.execute.mockRejectedValue(
      new ExpenseAccessDeniedException('stranger', GROUP_ID),
    );

    await expect(
      handler.execute(
        new ExpensesFindByCriteriaQuery({
          groupId: GROUP_ID,
          requesterId: 'stranger',
        }),
      ),
    ).rejects.toThrow(ExpenseAccessDeniedException);
    expect(repository.findByCriteria).not.toHaveBeenCalled();
  });
});
