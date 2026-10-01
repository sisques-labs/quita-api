import { ExpenseQueryableField } from '@contexts/expenses/transport/graphql/enums/expense-queryable-field.enum';
import { InputType } from '@nestjs/graphql';
import { createFilterInput } from '@sisques-labs/nestjs-kit/graphql';

@InputType('ExpenseFilterInput')
export class ExpenseFilterInput extends createFilterInput(
  ExpenseQueryableField,
  'Expense',
) {}
