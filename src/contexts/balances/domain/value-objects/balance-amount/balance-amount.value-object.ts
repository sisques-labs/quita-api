import { NumberValueObject } from '@sisques-labs/nestjs-kit';

/** Largest value of the Postgres `integer` column that stores the cents. */
export const BALANCE_AMOUNT_MAX_CENTS = 2147483647;

/** Positive integer amount in EUR cents, as recorded by expenses and payments. */
export class BalanceAmountValueObject extends NumberValueObject {
  constructor(cents: number) {
    super(cents, {
      min: 1,
      max: BALANCE_AMOUNT_MAX_CENTS,
      allowDecimals: false,
    });
  }
}
