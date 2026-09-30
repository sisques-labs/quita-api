import { ExpenseObject } from '@contexts/expenses/transport/graphql/objects/expense.object';
import { Field, ObjectType } from '@nestjs/graphql';
import { BasePaginatedResultDto } from '@sisques-labs/nestjs-kit/graphql';

@ObjectType('PaginatedExpenseResult')
export class PaginatedExpenseResultObject extends BasePaginatedResultDto {
  @Field(() => [ExpenseObject])
  items!: ExpenseObject[];
}
