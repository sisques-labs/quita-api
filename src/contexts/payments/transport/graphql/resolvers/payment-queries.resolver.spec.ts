import { PaymentsFindByCriteriaQuery } from '@contexts/payments/application/queries/payments-find-by-criteria/payments-find-by-criteria.query';
import { PaymentBuilder } from '@contexts/payments/domain/builders/payment.builder';
import { PaymentAccessDeniedException } from '@contexts/payments/domain/exceptions/payment-access-denied.exception';
import { PaymentQueryableField } from '@contexts/payments/transport/graphql/enums/payment-queryable-field.enum';
import { PaymentGraphQLMapper } from '@contexts/payments/transport/graphql/mappers/payment-graphql.mapper';
import { PaymentQueriesResolver } from '@contexts/payments/transport/graphql/resolvers/payment-queries.resolver';
import { QueryBus } from '@nestjs/cqrs';
import {
  FilterOperator,
  PaginatedResult,
  SortDirection,
} from '@sisques-labs/nestjs-kit';
import { Mocked } from 'vitest';

const PAYMENT_ID = '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11';
const GROUP_ID = '5d1c8f0a-3f55-4b6a-8a27-3a8d3b0d7e22';

describe('PaymentQueriesResolver', () => {
  let queryBus: Mocked<QueryBus>;
  let resolver: PaymentQueriesResolver;

  beforeEach(() => {
    queryBus = { execute: vi.fn() } as unknown as Mocked<QueryBus>;
    resolver = new PaymentQueriesResolver(queryBus, new PaymentGraphQLMapper());
  });

  it('lists the history with a criteria built from the typed input', async () => {
    queryBus.execute.mockResolvedValue(
      new PaginatedResult(
        [
          new PaymentBuilder()
            .withId(PAYMENT_ID)
            .withGroupId(GROUP_ID)
            .withFromUserId('user_a')
            .withToUserId('user_b')
            .withAmountCents(100)
            .withPaidOn('2026-03-01')
            .withCreatedBy('user_a')
            .buildViewModel(),
        ],
        1,
        1,
        10,
      ),
    );

    const page = await resolver.payments(
      GROUP_ID,
      {
        filters: [
          {
            field: PaymentQueryableField.FROM_USER_ID,
            operator: FilterOperator.EQUALS,
            value: 'user_a',
          },
        ],
        sorts: [
          {
            field: PaymentQueryableField.AMOUNT_CENTS,
            direction: SortDirection.ASC,
          },
        ],
        pagination: { page: 2, perPage: 5 },
      },
      { userId: 'user_a' },
    );

    const query = queryBus.execute.mock
      .calls[0][0] as PaymentsFindByCriteriaQuery;
    expect(query).toBeInstanceOf(PaymentsFindByCriteriaQuery);
    expect(query.groupId.value).toBe(GROUP_ID);
    expect(query.requesterId.value).toBe('user_a');
    expect(query.criteria.filters).toEqual([
      { field: 'fromUserId', operator: FilterOperator.EQUALS, value: 'user_a' },
    ]);
    expect(query.criteria.sorts).toEqual([
      { field: 'amountCents', direction: SortDirection.ASC },
    ]);
    expect(query.criteria.pagination).toEqual({ page: 2, perPage: 5 });
    expect(page.items.map((item) => item.id)).toEqual([PAYMENT_ID]);
  });

  it('lists with an empty criteria when none is given, and propagates access denied', async () => {
    queryBus.execute.mockResolvedValue(new PaginatedResult([], 0, 1, 10));
    await resolver.payments(GROUP_ID, undefined, { userId: 'user_a' });
    const query = queryBus.execute.mock
      .calls[0][0] as PaymentsFindByCriteriaQuery;
    expect(query.criteria.filters).toEqual([]);
    expect(query.criteria.sorts).toEqual([]);

    queryBus.execute.mockRejectedValue(
      new PaymentAccessDeniedException('N', GROUP_ID),
    );
    await expect(
      resolver.payments(GROUP_ID, undefined, { userId: 'N' }),
    ).rejects.toThrow(PaymentAccessDeniedException);
  });
});
