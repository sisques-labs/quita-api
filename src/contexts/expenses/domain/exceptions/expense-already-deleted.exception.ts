import { BaseException } from '@sisques-labs/nestjs-kit';

export class ExpenseAlreadyDeletedException extends BaseException {
  constructor(expenseId: string) {
    super(`Expense ${expenseId} is already deleted`);
  }
}
