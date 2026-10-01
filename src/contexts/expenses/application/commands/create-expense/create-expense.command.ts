import { ExpenseSplitType } from '@contexts/expenses/domain/enums/expense-split-type.enum';
import { ExpenseAmountValueObject } from '@contexts/expenses/domain/value-objects/expense-amount/expense-amount.value-object';
import { ExpenseCategoryValueObject } from '@contexts/expenses/domain/value-objects/expense-category/expense-category.value-object';
import { ExpenseDateValueObject } from '@contexts/expenses/domain/value-objects/expense-date/expense-date.value-object';
import { ExpenseDescriptionValueObject } from '@contexts/expenses/domain/value-objects/expense-description/expense-description.value-object';
import { ExpenseSplitTypeValueObject } from '@contexts/expenses/domain/value-objects/expense-split-type/expense-split-type.value-object';
import { ExpenseUserIdValueObject } from '@contexts/expenses/domain/value-objects/expense-user-id/expense-user-id.value-object';
import { UuidValueObject } from '@sisques-labs/nestjs-kit';

export interface CreateExpenseCommandInput {
  groupId: string;
  requesterId: string;
  amountCents: number;
  paidBy: string;
  spentOn: string;
  description?: string | null;
  category?: string | null;
  splitType?: string | null;
}

export class CreateExpenseCommand {
  readonly groupId: UuidValueObject;
  readonly requesterId: ExpenseUserIdValueObject;
  readonly amount: ExpenseAmountValueObject;
  readonly paidBy: ExpenseUserIdValueObject;
  /** Format-checked only; the handler enforces "not in the future" with the clock. */
  readonly spentOn: ExpenseDateValueObject;
  readonly description: ExpenseDescriptionValueObject | null;
  readonly category: ExpenseCategoryValueObject | null;
  readonly splitType: ExpenseSplitTypeValueObject;

  constructor(input: CreateExpenseCommandInput) {
    this.groupId = new UuidValueObject(input.groupId);
    this.requesterId = new ExpenseUserIdValueObject(input.requesterId);
    this.amount = new ExpenseAmountValueObject(input.amountCents);
    this.paidBy = new ExpenseUserIdValueObject(input.paidBy);
    this.spentOn = new ExpenseDateValueObject(input.spentOn);
    this.description = input.description?.trim()
      ? new ExpenseDescriptionValueObject(input.description)
      : null;
    this.category = input.category
      ? new ExpenseCategoryValueObject(input.category)
      : null;
    this.splitType = new ExpenseSplitTypeValueObject(
      input.splitType ?? ExpenseSplitType.EQUAL,
    );
  }
}
