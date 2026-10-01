import { AssertPaymentExistsService } from '@contexts/payments/application/services/write/assert-payment-exists/assert-payment-exists.service';
import { PaymentBuilder } from '@contexts/payments/domain/builders/payment.builder';
import { PaymentNotFoundException } from '@contexts/payments/domain/exceptions/payment-not-found.exception';
import { PaymentWriteRepository } from '@contexts/payments/domain/repositories/write/payment-write.repository';
import { UuidValueObject } from '@sisques-labs/nestjs-kit';
import { Mocked } from 'vitest';

const ID = '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11';
const GROUP_ID = '5d1c8f0a-3f55-4b6a-8a27-3a8d3b0d7e22';
const OTHER_GROUP_ID = '9a7c2d10-1b2c-4d3e-8f40-5a6b7c8d9e00';

const payment = () =>
  new PaymentBuilder()
    .withId(ID)
    .withGroupId(GROUP_ID)
    .withFromUserId('user_a')
    .withToUserId('user_b')
    .withAmountCents(500)
    .withPaidOn('2026-09-01')
    .withCreatedBy('user_a')
    .build();

describe('AssertPaymentExistsService', () => {
  let repository: Mocked<PaymentWriteRepository>;
  let service: AssertPaymentExistsService;

  beforeEach(() => {
    repository = {
      findById: vi.fn(),
      findByCriteria: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
    };
    service = new AssertPaymentExistsService(repository);
  });

  it('returns the payment when it belongs to the group', async () => {
    const aggregate = payment();
    repository.findById.mockResolvedValue(aggregate);

    await expect(
      service.execute(new UuidValueObject(ID), new UuidValueObject(GROUP_ID)),
    ).resolves.toBe(aggregate);
    expect(repository.findById).toHaveBeenCalledWith(ID);
  });

  it('reports a missing payment', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(
      service.execute(new UuidValueObject(ID), new UuidValueObject(GROUP_ID)),
    ).rejects.toThrow(PaymentNotFoundException);
  });

  it('reports a payment of another group as not found (no cross-group leak)', async () => {
    repository.findById.mockResolvedValue(payment());

    await expect(
      service.execute(
        new UuidValueObject(ID),
        new UuidValueObject(OTHER_GROUP_ID),
      ),
    ).rejects.toThrow(PaymentNotFoundException);
  });
});
