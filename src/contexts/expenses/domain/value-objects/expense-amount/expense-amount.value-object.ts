import { EXPENSE_AMOUNT_MAX_CENTS } from '@contexts/expenses/domain/constants/expense-amount-max-cents.constant';
import { NumberValueObject } from '@sisques-labs/nestjs-kit';

/** Positive integer amount in EUR cents. */
export class ExpenseAmountValueObject extends NumberValueObject {
  constructor(cents: number) {
    super(cents, {
      min: 1,
      max: EXPENSE_AMOUNT_MAX_CENTS,
      allowDecimals: false,
    });
  }
}
