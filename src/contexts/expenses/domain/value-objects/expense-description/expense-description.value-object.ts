import { EXPENSE_DESCRIPTION_MAX_LENGTH } from '@contexts/expenses/domain/constants/expense-description-max-length.constant';
import { StringValueObject } from '@sisques-labs/nestjs-kit';

/** Free-text note: trimmed and at most 200 characters. */
export class ExpenseDescriptionValueObject extends StringValueObject {
  constructor(value: string) {
    super(value.trim(), {
      minLength: 1,
      maxLength: EXPENSE_DESCRIPTION_MAX_LENGTH,
      allowEmpty: false,
    });
  }
}
