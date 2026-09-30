import { PaymentAggregate } from '@contexts/payments/domain/aggregates/payment.aggregate';
import { PaymentNotFoundException } from '@contexts/payments/domain/exceptions/payment-not-found.exception';
import {
  PAYMENT_WRITE_REPOSITORY,
  PaymentWriteRepository,
} from '@contexts/payments/domain/repositories/write/payment-write.repository';
import { Inject, Injectable } from '@nestjs/common';

/**
 * Loads a payment for mutation. A payment that belongs to another group is
 * reported as missing, so ids cannot be probed across groups.
 */
@Injectable()
export class AssertPaymentExistsService {
  constructor(
    @Inject(PAYMENT_WRITE_REPOSITORY)
    private readonly repository: PaymentWriteRepository,
  ) {}

  async execute(paymentId: string, groupId: string): Promise<PaymentAggregate> {
    const payment = await this.repository.findById(paymentId);
    if (!payment || payment.groupId.value !== groupId) {
      throw new PaymentNotFoundException(paymentId);
    }
    return payment;
  }
}
