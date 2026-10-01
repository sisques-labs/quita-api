import { PaymentsFindByCriteriaHandler } from '@contexts/payments/application/queries/payments-find-by-criteria/payments-find-by-criteria.handler';
import { PaymentsFindByCriteriaQuery } from '@contexts/payments/application/queries/payments-find-by-criteria/payments-find-by-criteria.query';
import { AssertRequesterIsGroupMemberService } from '@contexts/payments/application/services/read/assert-requester-is-group-member/assert-requester-is-group-member.service';
import { PaymentBuilder } from '@contexts/payments/domain/builders/payment.builder';
import { PaymentAccessDeniedException } from '@contexts/payments/domain/exceptions/payment-access-denied.exception';
import { IPaymentReadRepository } from '@contexts/payments/domain/repositories/read/payment-read.repository';
import {
  Criteria,
  FilterOperator,
  PaginatedResult,
  SortDirection,
} from '@sisques-labs/nestjs-kit';
import { Mocked } from 'vitest';

const GROUP_ID = '5d1c8f0a-3f55-4b6a-8a27-3a8d3b0d7e22';
const OTHER_GROUP_ID = '9a7c2d10-1b2c-4d3e-8f40-5a6b7c8d9e00';

const viewModel = (id: string, paidOn: string, deletedAt: Date | null) =>
  new PaymentBuilder()
    .withId(id)
    .withGroupId(GROUP_ID)
    .withFromUserId('user_a')
    .withToUserId('user_b')
    .withAmountCents(100)
    .withPaidOn(paidOn)
    .withCreatedBy('user_a')
    .withDeletedAt(deletedAt)
    .buildViewModel();

describe('PaymentsFindByCriteriaHandler', () => {
  let repository: Mocked<IPaymentReadRepository>;
  let assertMember: Mocked<AssertRequesterIsGroupMemberService>;
  let handler: PaymentsFindByCriteriaHandler;

  const criteriaSent = (): Criteria =>
    repository.findByCriteria.mock.calls[0][0];

  beforeEach(() => {
    repository = {
      findById: vi.fn(),
      findByCriteria: vi.fn(),
      findActiveByGroupId: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
    };
    assertMember = {
      execute: vi.fn(),
    } as unknown as Mocked<AssertRequesterIsGroupMemberService>;
    handler = new PaymentsFindByCriteriaHandler(assertMember, repository);
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
      new PaymentsFindByCriteriaQuery({
        groupId: GROUP_ID,
        requesterId: 'user_a',
      }),
    );

    expect(result).toBe(page);
    expect(result.items.map((p) => p.deletedAt === null)).toEqual([
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
      new PaymentsFindByCriteriaQuery({
        groupId: GROUP_ID,
        requesterId: 'user_a',
        criteria: new Criteria([
          {
            field: 'fromUserId',
            operator: FilterOperator.EQUALS,
            value: 'user_b',
          },
        ]),
      }),
    );

    expect(criteriaSent().filters).toEqual([
      { field: 'fromUserId', operator: FilterOperator.EQUALS, value: 'user_b' },
      { field: 'groupId', operator: FilterOperator.EQUALS, value: GROUP_ID },
    ]);
  });

  it('discards a client filter on groupId so another group cannot be read', async () => {
    await handler.execute(
      new PaymentsFindByCriteriaQuery({
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

  it('orders by paidOn desc then createdAt desc when no sort is given', async () => {
    await handler.execute(
      new PaymentsFindByCriteriaQuery({
        groupId: GROUP_ID,
        requesterId: 'user_a',
      }),
    );

    expect(criteriaSent().sorts).toEqual([
      { field: 'paidOn', direction: SortDirection.DESC },
      { field: 'createdAt', direction: SortDirection.DESC },
    ]);
  });

  it('keeps the client sort and pagination when given', async () => {
    await handler.execute(
      new PaymentsFindByCriteriaQuery({
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
      new PaymentAccessDeniedException('stranger', GROUP_ID),
    );

    await expect(
      handler.execute(
        new PaymentsFindByCriteriaQuery({
          groupId: GROUP_ID,
          requesterId: 'stranger',
        }),
      ),
    ).rejects.toThrow(PaymentAccessDeniedException);
    expect(repository.findByCriteria).not.toHaveBeenCalled();
  });
});
