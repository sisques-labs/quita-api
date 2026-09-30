import { BaseException } from '@sisques-labs/nestjs-kit';

export class ExpenseNotFoundException extends BaseException {
  constructor(expenseId: string) {
    super(`Expense ${expenseId} not found`);
  }
}
