import { ExpenseCategory } from '@contexts/expenses/domain/enums/expense-category.enum';
import { ExpenseSplitType } from '@contexts/expenses/domain/enums/expense-split-type.enum';
import { ExpenseQueryableField } from '@contexts/expenses/transport/graphql/enums/expense-queryable-field.enum';
import { registerEnumType } from '@nestjs/graphql';

registerEnumType(ExpenseCategory, {
  name: 'ExpenseCategory',
  description: 'Fixed category of an expense',
});

registerEnumType(ExpenseSplitType, {
  name: 'ExpenseSplitType',
  description: 'How an expense is split between the two members',
});

registerEnumType(ExpenseQueryableField, {
  name: 'ExpenseQueryableFieldEnum',
  description: 'Expense fields that can be filtered or sorted by',
});
