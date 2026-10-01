import { ExpenseCategory } from '@contexts/expenses/domain/enums/expense-category.enum';
import { ExpenseSplitType } from '@contexts/expenses/domain/enums/expense-split-type.enum';
import { IExpensePrimitives } from '@contexts/expenses/domain/primitives/expense.primitives';
import { BaseViewModel } from '@sisques-labs/nestjs-kit';

/** Read-side projection of an expense; soft-deleted rows carry `deletedAt`. */
export class ExpenseViewModel extends BaseViewModel {
  readonly groupId: string;
  readonly amountCents: number;
  readonly currency: string;
  readonly paidBy: string;
  readonly spentOn: string;
  readonly description: string | null;
  readonly category: ExpenseCategory | null;
  readonly splitType: ExpenseSplitType;
  readonly createdBy: string;
  readonly updatedBy: string;
  readonly deletedAt: Date | null;

  constructor(props: IExpensePrimitives) {
    super(props.id, props.createdAt, props.updatedAt);
    this.groupId = props.groupId;
    this.amountCents = props.amountCents;
    this.currency = props.currency;
    this.paidBy = props.paidBy;
    this.spentOn = props.spentOn;
    this.description = props.description;
    this.category = props.category;
    this.splitType = props.splitType;
    this.createdBy = props.createdBy;
    this.updatedBy = props.updatedBy;
    this.deletedAt = props.deletedAt;
  }
}
