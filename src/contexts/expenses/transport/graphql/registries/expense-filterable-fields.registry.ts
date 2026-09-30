import { ExpenseCategory } from '@contexts/expenses/domain/enums/expense-category.enum';
import { ExpenseSplitType } from '@contexts/expenses/domain/enums/expense-split-type.enum';
import { ExpenseQueryableField } from '@contexts/expenses/transport/graphql/enums/expense-queryable-field.enum';
import { FilterFieldRegistry } from '@sisques-labs/nestjs-kit';

/** Expected value shape per queryable field; enum columns reuse the domain enums. */
export const expenseFilterableFields: FilterFieldRegistry<ExpenseQueryableField> =
  {
    [ExpenseQueryableField.ID]: { type: 'uuid' },
    [ExpenseQueryableField.PAID_BY]: { type: 'string' },
    [ExpenseQueryableField.SPENT_ON]: { type: 'date' },
    [ExpenseQueryableField.AMOUNT_CENTS]: { type: 'number' },
    [ExpenseQueryableField.CATEGORY]: { type: 'enum', enum: ExpenseCategory },
    [ExpenseQueryableField.SPLIT_TYPE]: {
      type: 'enum',
      enum: ExpenseSplitType,
    },
    [ExpenseQueryableField.CREATED_AT]: { type: 'date' },
    [ExpenseQueryableField.DELETED_AT]: { type: 'date' },
  };
