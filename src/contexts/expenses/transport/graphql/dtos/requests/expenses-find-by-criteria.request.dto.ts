import { ExpenseFilterInput } from '@contexts/expenses/transport/graphql/dtos/requests/expense-filter.input';
import { ExpenseSortInput } from '@contexts/expenses/transport/graphql/dtos/requests/expense-sort.input';
import { Field, InputType } from '@nestjs/graphql';
import { BaseFindByCriteriaInput } from '@sisques-labs/nestjs-kit/graphql';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';

/** The group and requester are separate arguments, never part of the criteria. */
@InputType('ExpensesFindByCriteriaRequestDto')
export class ExpensesFindByCriteriaRequestDto extends BaseFindByCriteriaInput {
  @Field(() => [ExpenseFilterInput], { nullable: true, defaultValue: [] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ExpenseFilterInput)
  declare filters?: ExpenseFilterInput[];

  @Field(() => [ExpenseSortInput], { nullable: true, defaultValue: [] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ExpenseSortInput)
  declare sorts?: ExpenseSortInput[];
}
