import { ExpenseCategory } from '@contexts/expenses/domain/enums/expense-category.enum';
import { EnumValueObject } from '@sisques-labs/nestjs-kit';

export class ExpenseCategoryValueObject extends EnumValueObject<
  typeof ExpenseCategory
> {
  protected get enumObject(): typeof ExpenseCategory {
    return ExpenseCategory;
  }
}
