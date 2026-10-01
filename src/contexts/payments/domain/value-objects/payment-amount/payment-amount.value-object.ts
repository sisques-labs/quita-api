import { PAYMENT_AMOUNT_MAX_CENTS } from '@contexts/payments/domain/constants/payment-amount-max-cents.constant';
import { NumberValueObject } from '@sisques-labs/nestjs-kit';

/** Positive integer amount in EUR cents. */
export class PaymentAmountValueObject extends NumberValueObject {
  constructor(cents: number) {
    super(cents, {
      min: 1,
      max: PAYMENT_AMOUNT_MAX_CENTS,
      allowDecimals: false,
    });
  }
}
