import { ExpenseViewModel } from '@contexts/expenses/domain/view-models/expense.view-model';
import { IBaseReadRepository } from '@sisques-labs/nestjs-kit';

export const EXPENSE_READ_REPOSITORY = Symbol('EXPENSE_READ_REPOSITORY');

/**
 * Query view over the `expenses` table. There is no separate projection store, so
 * `save` / `delete` are no-ops (the write side persists). `findByCriteria`
 * translates every filter of the criteria (all 8 `FilterOperator`s) and its
 * sorts; soft-deleted rows are included. Field names are view-model
 * properties; the query handler always adds a `groupId` equality filter.
 */
export interface IExpenseReadRepository extends IBaseReadRepository<ExpenseViewModel> {
  /** Every non-deleted expense of the group (used by the balance calculation). */
  findActiveByGroupId(groupId: string): Promise<ExpenseViewModel[]>;
}
