import { ExpensesFindActiveByGroupQuery } from '@contexts/expenses/application/queries/expenses-find-active-by-group/expenses-find-active-by-group.query';
import {
  EXPENSE_READ_REPOSITORY,
  ExpenseReadRepository,
} from '@contexts/expenses/domain/repositories/read/expense-read.repository';
import { ExpenseViewModel } from '@contexts/expenses/domain/view-models/expense.view-model';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

@QueryHandler(ExpensesFindActiveByGroupQuery)
export class ExpensesFindActiveByGroupHandler implements IQueryHandler<
  ExpensesFindActiveByGroupQuery,
  ExpenseViewModel[]
> {
  private readonly logger = new Logger(ExpensesFindActiveByGroupHandler.name);

  constructor(
    @Inject(EXPENSE_READ_REPOSITORY)
    private readonly repository: ExpenseReadRepository,
  ) {}

  async execute(
    query: ExpensesFindActiveByGroupQuery,
  ): Promise<ExpenseViewModel[]> {
    this.logger.log(`Finding active expenses of group ${query.groupId.value}`);
    return this.repository.findActiveByGroupId(query.groupId.value);
  }
}
