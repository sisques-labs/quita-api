import { ExpenseChanges } from '@contexts/expenses/domain/aggregates/expense.aggregate';
import { ExpenseCategory } from '@contexts/expenses/domain/enums/expense-category.enum';
import { ExpenseSplitType } from '@contexts/expenses/domain/enums/expense-split-type.enum';
import { ExpenseAmountValueObject } from '@contexts/expenses/domain/value-objects/expense-amount/expense-amount.value-object';
import { ExpenseCategoryValueObject } from '@contexts/expenses/domain/value-objects/expense-category/expense-category.value-object';
import { ExpenseDateValueObject } from '@contexts/expenses/domain/value-objects/expense-date/expense-date.value-object';
import { ExpenseDescriptionValueObject } from '@contexts/expenses/domain/value-objects/expense-description/expense-description.value-object';
import { ExpenseSplitTypeValueObject } from '@contexts/expenses/domain/value-objects/expense-split-type/expense-split-type.value-object';
import { ExpenseUserIdValueObject } from '@contexts/expenses/domain/value-objects/expense-user-id/expense-user-id.value-object';
import { UuidValueObject } from '@sisques-labs/nestjs-kit';

/**
 * Omitted (`undefined`) fields keep their value; `description` and
 * `category` accept `null` to clear them.
 */
export interface EditExpenseCommandInput {
  expenseId: string;
  groupId: string;
  requesterId: string;
  amountCents?: number;
  paidBy?: string;
  spentOn?: string;
  description?: string | null;
  category?: string | null;
  splitType?: string;
}

export class EditExpenseCommand {
  readonly expenseId: UuidValueObject;
  readonly groupId: UuidValueObject;
  readonly requesterId: ExpenseUserIdValueObject;
  /** Every present change has been validated by its value object. */
  readonly changes: ExpenseChanges;

  constructor(input: EditExpenseCommandInput) {
    this.expenseId = new UuidValueObject(input.expenseId);
    this.groupId = new UuidValueObject(input.groupId);
    this.requesterId = new ExpenseUserIdValueObject(input.requesterId);
    this.changes = EditExpenseCommand.validatedChanges(input);
  }

  private static validatedChanges(
    input: EditExpenseCommandInput,
  ): ExpenseChanges {
    const changes: ExpenseChanges = {};
    if (input.amountCents !== undefined) {
      changes.amountCents = new ExpenseAmountValueObject(
        input.amountCents,
      ).value;
    }
    if (input.paidBy !== undefined) {
      changes.paidBy = new ExpenseUserIdValueObject(input.paidBy).value;
    }
    if (input.spentOn !== undefined) {
      // Format only; "not in the future" is enforced by the aggregate with the clock.
      changes.spentOn = new ExpenseDateValueObject(input.spentOn).value;
    }
    if (input.description !== undefined) {
      changes.description = input.description?.trim()
        ? new ExpenseDescriptionValueObject(input.description).value
        : null;
    }
    if (input.category !== undefined) {
      changes.category =
        input.category === null
          ? null
          : (new ExpenseCategoryValueObject(input.category)
              .value as ExpenseCategory);
    }
    if (input.splitType !== undefined) {
      changes.splitType = new ExpenseSplitTypeValueObject(input.splitType)
        .value as ExpenseSplitType;
    }
    return changes;
  }
}
