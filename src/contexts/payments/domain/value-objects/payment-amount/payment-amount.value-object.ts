import { NumberValueObject } from '@sisques-labs/nestjs-kit';

/** Largest value of the Postgres `integer` column that stores the cents. */
export const PAYMENT_AMOUNT_MAX_CENTS = 2147483647;

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
