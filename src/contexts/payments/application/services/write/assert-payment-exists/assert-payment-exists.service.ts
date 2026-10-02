import { PaymentAggregate } from '@contexts/payments/domain/aggregates/payment.aggregate';
import { PaymentNotFoundException } from '@contexts/payments/domain/exceptions/payment-not-found.exception';
import {
  PAYMENT_WRITE_REPOSITORY,
  PaymentWriteRepository,
} from '@contexts/payments/domain/repositories/write/payment-write.repository';
import { Inject, Injectable } from '@nestjs/common';
import { UuidValueObject } from '@sisques-labs/nestjs-kit';

/**
 * Loads a payment for mutation. A payment that belongs to another group is
 * reported as missing, so ids cannot be probed across groups.
 *
 * Not `IBaseService` — that interface is single-input, and this assertion
 * inherently needs two (paymentId + groupId).
 */
@Injectable()
export class AssertPaymentExistsService {
  constructor(
    @Inject(PAYMENT_WRITE_REPOSITORY)
    private readonly repository: PaymentWriteRepository,
  ) {}

  async execute(
    paymentId: UuidValueObject,
    groupId: UuidValueObject,
  ): Promise<PaymentAggregate> {
    const payment = await this.repository.findById(paymentId.value);
    if (!payment || payment.groupId.value !== groupId.value) {
      throw new PaymentNotFoundException(paymentId.value);
    }
    return payment;
  }
}
