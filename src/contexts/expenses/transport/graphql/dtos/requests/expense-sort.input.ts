import { ExpenseQueryableField } from '@contexts/expenses/transport/graphql/enums/expense-queryable-field.enum';
import { InputType } from '@nestjs/graphql';
import { createSortInput } from '@sisques-labs/nestjs-kit/graphql';

@InputType('ExpenseSortInput')
export class ExpenseSortInput extends createSortInput(
  ExpenseQueryableField,
  'Expense',
) {}
