import { ExpenseCategory } from '@contexts/expenses/domain/enums/expense-category.enum';
import { ExpenseSplitType } from '@contexts/expenses/domain/enums/expense-split-type.enum';
import { Field, ID, InputType, Int } from '@nestjs/graphql';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

/**
 * Omitted fields keep their value; `description` and `category` accept an
 * explicit `null` to clear them.
 */
@InputType('ExpenseEditRequestDto')
export class ExpenseEditRequestDto {
  @Field(() => ID)
  @IsString()
  groupId!: string;

  @Field(() => ID)
  @IsString()
  expenseId!: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  amountCents?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  paidBy?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  spentOn?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;

  @Field(() => ExpenseCategory, { nullable: true })
  @IsOptional()
  @IsEnum(ExpenseCategory)
  category?: ExpenseCategory | null;

  @Field(() => ExpenseSplitType, { nullable: true })
  @IsOptional()
  @IsEnum(ExpenseSplitType)
  splitType?: ExpenseSplitType;
}
