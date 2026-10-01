import { ExpenseCategory } from '@contexts/expenses/domain/enums/expense-category.enum';
import { ExpenseSplitType } from '@contexts/expenses/domain/enums/expense-split-type.enum';
import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { BasePaginatedResultDto } from '@sisques-labs/nestjs-kit/graphql';

@ObjectType('ExpenseResponseDto')
export class ExpenseResponseDto {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  groupId!: string;

  @Field(() => Int)
  amountCents!: number;

  @Field(() => String)
  currency!: string;

  @Field(() => String)
  paidBy!: string;

  @Field(() => String, { description: 'Date-only YYYY-MM-DD' })
  spentOn!: string;

  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field(() => ExpenseCategory, { nullable: true })
  category!: ExpenseCategory | null;

  @Field(() => ExpenseSplitType)
  splitType!: ExpenseSplitType;

  @Field(() => String)
  createdBy!: string;

  @Field(() => String)
  updatedBy!: string;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;

  @Field(() => Date, {
    nullable: true,
    description: 'Set when the expense was soft-deleted',
  })
  deletedAt!: Date | null;
}

@ObjectType('PaginatedExpenseResultDto')
export class PaginatedExpenseResultDto extends BasePaginatedResultDto {
  @Field(() => [ExpenseResponseDto])
  items!: ExpenseResponseDto[];
}
