import { ExpenseCategory } from '@contexts/expenses/domain/enums/expense-category.enum';
import { ExpenseSplitType } from '@contexts/expenses/domain/enums/expense-split-type.enum';
import { BaseViewModel } from '@sisques-labs/nestjs-kit';

/** Read-side projection of an expense; soft-deleted rows carry `deletedAt`. */
export class ExpenseViewModel extends BaseViewModel {
  constructor(
    id: string,
    createdAt: Date,
    updatedAt: Date,
    readonly groupId: string,
    readonly amountCents: number,
    readonly currency: string,
    readonly paidBy: string,
    readonly spentOn: string,
    readonly description: string | null,
    readonly category: ExpenseCategory | null,
    readonly splitType: ExpenseSplitType,
    readonly createdBy: string,
    readonly updatedBy: string,
    readonly deletedAt: Date | null,
  ) {
    super(id, createdAt, updatedAt);
  }
}
