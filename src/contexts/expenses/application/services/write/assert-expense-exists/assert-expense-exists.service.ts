import { ExpenseAggregate } from '@contexts/expenses/domain/aggregates/expense.aggregate';
import { ExpenseNotFoundException } from '@contexts/expenses/domain/exceptions/expense-not-found.exception';
import {
  EXPENSE_WRITE_REPOSITORY,
  IExpenseWriteRepository,
} from '@contexts/expenses/domain/repositories/write/expense-write.repository';
import { Inject, Injectable } from '@nestjs/common';
import { UuidValueObject } from '@sisques-labs/nestjs-kit';

/**
 * Loads an expense for mutation. An expense that belongs to another group is
 * reported as missing, so ids cannot be probed across groups.
 *
 * Not `IBaseService` — that interface is single-input, and this assertion
 * inherently needs two (expenseId + groupId).
 */
@Injectable()
export class AssertExpenseExistsService {
  constructor(
    @Inject(EXPENSE_WRITE_REPOSITORY)
    private readonly repository: IExpenseWriteRepository,
  ) {}

  async execute(
    expenseId: UuidValueObject,
    groupId: UuidValueObject,
  ): Promise<ExpenseAggregate> {
    const expense = await this.repository.findById(expenseId.value);
    if (!expense || expense.groupId.value !== groupId.value) {
      throw new ExpenseNotFoundException(expenseId.value);
    }
    return expense;
  }
}
