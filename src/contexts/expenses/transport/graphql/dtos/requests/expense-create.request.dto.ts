import { ExpenseCategory } from '@contexts/expenses/domain/enums/expense-category.enum';
import { ExpenseSplitType } from '@contexts/expenses/domain/enums/expense-split-type.enum';
import { Field, ID, InputType, Int } from '@nestjs/graphql';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

/** The requester is never an input: it is the authenticated user. */
@InputType('CreateExpenseInput')
export class CreateExpenseInput {
  @Field(() => ID)
  @IsString()
  groupId!: string;

  @Field(() => Int, { description: 'Positive amount in euro cents' })
  @IsInt()
  amountCents!: number;

  @Field(() => String, { description: 'User id of the member who paid' })
  @IsString()
  paidBy!: string;

  @Field(() => String, {
    description: 'Date-only YYYY-MM-DD, today or in the past',
  })
  @IsString()
  spentOn!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => ExpenseCategory, { nullable: true })
  @IsOptional()
  @IsEnum(ExpenseCategory)
  category?: ExpenseCategory;

  @Field(() => ExpenseSplitType, {
    nullable: true,
    description: 'Defaults to EQUAL',
  })
  @IsOptional()
  @IsEnum(ExpenseSplitType)
  splitType?: ExpenseSplitType;
}

/**
 * Omitted fields keep their value; `description` and `category` accept an
 * explicit `null` to clear them.
 */
@InputType('EditExpenseInput')
export class EditExpenseInput {
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

@InputType('DeleteExpenseInput')
export class DeleteExpenseInput {
  @Field(() => ID)
  @IsString()
  groupId!: string;

  @Field(() => ID)
  @IsString()
  expenseId!: string;
}
