import { ExpenseAmountValueObject } from '@contexts/expenses/domain/value-objects/expense-amount/expense-amount.value-object';
import { ExpenseCategoryValueObject } from '@contexts/expenses/domain/value-objects/expense-category/expense-category.value-object';
import { ExpenseDateValueObject } from '@contexts/expenses/domain/value-objects/expense-date/expense-date.value-object';
import { ExpenseDescriptionValueObject } from '@contexts/expenses/domain/value-objects/expense-description/expense-description.value-object';
import { ExpenseSplitTypeValueObject } from '@contexts/expenses/domain/value-objects/expense-split-type/expense-split-type.value-object';
import { ExpenseUserIdValueObject } from '@contexts/expenses/domain/value-objects/expense-user-id/expense-user-id.value-object';
import {
  DateValueObject,
  IBaseAggregate,
  UuidValueObject,
} from '@sisques-labs/nestjs-kit';

export interface IExpense extends IBaseAggregate {
  groupId: UuidValueObject;
  amount: ExpenseAmountValueObject;
  paidBy: ExpenseUserIdValueObject;
  spentOn: ExpenseDateValueObject;
  description: ExpenseDescriptionValueObject | null;
  category: ExpenseCategoryValueObject | null;
  splitType: ExpenseSplitTypeValueObject;
  createdBy: ExpenseUserIdValueObject;
  updatedBy: ExpenseUserIdValueObject;
  deletedAt: DateValueObject | null;
}
