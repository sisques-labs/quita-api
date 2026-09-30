import { PaymentsBusAdapter } from '@contexts/balances/infrastructure/adapters/payments-bus.adapter';
import { PaymentsFindActiveByGroupQuery } from '@contexts/payments/application/queries/payments-find-active-by-group/payments-find-active-by-group.query';
import { PaymentViewModel } from '@contexts/payments/domain/view-models/payment.view-model';
import { QueryBus } from '@nestjs/cqrs';
import { Mocked } from 'vitest';

const GROUP_ID = '5d1c8f0a-3f55-4b6a-8a27-3a8d3b0d7e22';
const NOW = new Date('2026-03-01T10:00:00Z');

const payment = (
  fromUserId: string,
  toUserId: string,
  amountCents: number,
): PaymentViewModel =>
  new PaymentViewModel(
    '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c22',
    NOW,
    NOW,
    GROUP_ID,
    fromUserId,
    toUserId,
    amountCents,
    'EUR',
    '2026-03-01',
    null,
    fromUserId,
    fromUserId,
    null,
  );

describe('PaymentsBusAdapter', () => {
  let queryBus: Mocked<QueryBus>;
  let adapter: PaymentsBusAdapter;

  beforeEach(() => {
    queryBus = { execute: vi.fn() } as unknown as Mocked<QueryBus>;
    adapter = new PaymentsBusAdapter(queryBus);
  });

  it('maps the active payments of the group to balance entries', async () => {
    queryBus.execute.mockResolvedValue([
      payment('user_b', 'user_a', 500),
      payment('user_a', 'user_b', 75),
    ]);

    await expect(adapter.listActivePayments(GROUP_ID)).resolves.toEqual([
      { fromUserId: 'user_b', toUserId: 'user_a', amountCents: 500 },
      { fromUserId: 'user_a', toUserId: 'user_b', amountCents: 75 },
    ]);

    const query = queryBus.execute.mock
      .calls[0][0] as PaymentsFindActiveByGroupQuery;
    expect(query).toBeInstanceOf(PaymentsFindActiveByGroupQuery);
    expect(query.groupId.value).toBe(GROUP_ID);
  });

  it('returns no entries for a group without payments', async () => {
    queryBus.execute.mockResolvedValue([]);

    await expect(adapter.listActivePayments(GROUP_ID)).resolves.toEqual([]);
    expect(queryBus.execute).toHaveBeenCalledTimes(1);
  });
});
