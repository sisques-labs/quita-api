import { Field, ID, InputType } from '@nestjs/graphql';
import { IsString } from 'class-validator';

@InputType('ExpenseDeleteRequestDto')
export class ExpenseDeleteRequestDto {
  @Field(() => ID)
  @IsString()
  groupId!: string;

  @Field(() => ID)
  @IsString()
  expenseId!: string;
}
