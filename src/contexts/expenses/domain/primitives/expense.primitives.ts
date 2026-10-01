import { ExpenseCategory } from '@contexts/expenses/domain/enums/expense-category.enum';
import { ExpenseSplitType } from '@contexts/expenses/domain/enums/expense-split-type.enum';
import { BasePrimitives } from '@sisques-labs/nestjs-kit';

export type IExpensePrimitives = BasePrimitives & {
  groupId: string;
  amountCents: number;
  currency: string;
  paidBy: string;
  /** Date-only `YYYY-MM-DD`. */
  spentOn: string;
  description: string | null;
  category: ExpenseCategory | null;
  splitType: ExpenseSplitType;
  createdBy: string;
  updatedBy: string;
  deletedAt: Date | null;
};
