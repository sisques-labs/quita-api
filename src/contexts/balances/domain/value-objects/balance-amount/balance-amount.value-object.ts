import { BALANCE_AMOUNT_MAX_CENTS } from '@contexts/balances/domain/constants/balance-amount-max-cents.constant';
import { NumberValueObject } from '@sisques-labs/nestjs-kit';

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
