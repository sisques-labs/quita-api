import { PaymentsFindActiveByGroupHandler } from '@contexts/payments/application/queries/payments-find-active-by-group/payments-find-active-by-group.handler';
import { PaymentsFindActiveByGroupQuery } from '@contexts/payments/application/queries/payments-find-active-by-group/payments-find-active-by-group.query';
import { PaymentBuilder } from '@contexts/payments/domain/builders/payment.builder';
import { IPaymentReadRepository } from '@contexts/payments/domain/repositories/read/payment-read.repository';
import { Mocked } from 'vitest';

const GROUP_ID = '5d1c8f0a-3f55-4b6a-8a27-3a8d3b0d7e22';

describe('PaymentsFindActiveByGroupHandler', () => {
  let repository: Mocked<IPaymentReadRepository>;
  let handler: PaymentsFindActiveByGroupHandler;

  beforeEach(() => {
    repository = {
      findById: vi.fn(),
      findByCriteria: vi.fn(),
      findActiveByGroupId: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
    };
    handler = new PaymentsFindActiveByGroupHandler(repository);
  });

  it('returns the active payments of the group', async () => {
    const payments = [
      new PaymentBuilder()
        .withId('0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11')
        .withGroupId(GROUP_ID)
        .withFromUserId('user_a')
        .withToUserId('user_b')
        .withAmountCents(100)
        .withPaidOn('2026-09-29')
        .withCreatedBy('user_a')
        .buildViewModel(),
    ];
    repository.findActiveByGroupId.mockResolvedValue(payments);

    const result = await handler.execute(
      new PaymentsFindActiveByGroupQuery({ groupId: GROUP_ID }),
    );

    expect(result).toBe(payments);
    expect(repository.findActiveByGroupId).toHaveBeenCalledWith(GROUP_ID);
  });

  it('rejects a malformed group id', () => {
    expect(
      () => new PaymentsFindActiveByGroupQuery({ groupId: 'nope' }),
    ).toThrow();
  });
});
