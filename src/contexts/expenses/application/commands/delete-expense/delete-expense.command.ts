import { ExpenseUserIdValueObject } from '@contexts/expenses/domain/value-objects/expense-user-id/expense-user-id.value-object';
import { UuidValueObject } from '@sisques-labs/nestjs-kit';

export interface DeleteExpenseCommandInput {
  expenseId: string;
  groupId: string;
  requesterId: string;
}

export class DeleteExpenseCommand {
  readonly expenseId: UuidValueObject;
  readonly groupId: UuidValueObject;
  readonly requesterId: ExpenseUserIdValueObject;

  constructor(input: DeleteExpenseCommandInput) {
    this.expenseId = new UuidValueObject(input.expenseId);
    this.groupId = new UuidValueObject(input.groupId);
    this.requesterId = new ExpenseUserIdValueObject(input.requesterId);
  }
}
