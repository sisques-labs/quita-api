import { ExpenseAggregate } from '@contexts/expenses/domain/aggregates/expense.aggregate';
import { ExpenseNotFoundException } from '@contexts/expenses/domain/exceptions/expense-not-found.exception';
import {
  EXPENSE_WRITE_REPOSITORY,
  ExpenseWriteRepository,
} from '@contexts/expenses/domain/repositories/write/expense-write.repository';
import { Inject, Injectable } from '@nestjs/common';

/**
 * Loads an expense for mutation. An expense that belongs to another group is
 * reported as missing, so ids cannot be probed across groups.
 */
@Injectable()
export class AssertExpenseExistsService {
  constructor(
    @Inject(EXPENSE_WRITE_REPOSITORY)
    private readonly repository: ExpenseWriteRepository,
  ) {}

  async execute(expenseId: string, groupId: string): Promise<ExpenseAggregate> {
    const expense = await this.repository.findById(expenseId);
    if (!expense || expense.groupId.value !== groupId) {
      throw new ExpenseNotFoundException(expenseId);
    }
    return expense;
  }
}
