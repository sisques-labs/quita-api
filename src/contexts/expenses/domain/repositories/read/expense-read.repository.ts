import { ExpenseViewModel } from '@contexts/expenses/domain/view-models/expense.view-model';
import { Criteria, PaginatedResult } from '@sisques-labs/nestjs-kit';

export const EXPENSE_READ_REPOSITORY = Symbol('EXPENSE_READ_REPOSITORY');

/**
 * Query-only view over the `expenses` table. It does not extend
 * `IBaseReadRepository`: there is no separate projection store.
 */
export interface ExpenseReadRepository {
  /**
   * Translates every filter of `criteria` (all 8 `FilterOperator`s) and its
   * sorts. Soft-deleted rows are included. Field names are view-model
   * properties; the query handler always adds a `groupId` equality filter.
   */
  findByCriteria(
    criteria: Criteria,
  ): Promise<PaginatedResult<ExpenseViewModel>>;

  /** Every non-deleted expense of the group (used by the balance calculation). */
  findActiveByGroupId(groupId: string): Promise<ExpenseViewModel[]>;
}
