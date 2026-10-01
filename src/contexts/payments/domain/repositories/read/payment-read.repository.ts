import { PaymentViewModel } from '@contexts/payments/domain/view-models/payment.view-model';
import { Criteria, PaginatedResult } from '@sisques-labs/nestjs-kit';

export const PAYMENT_READ_REPOSITORY = Symbol('PAYMENT_READ_REPOSITORY');

/**
 * Query-only view over the `payments` table. It does not extend
 * `IBaseReadRepository`: there is no separate projection store.
 */
export interface PaymentReadRepository {
  /**
   * Translates every filter of `criteria` (all 8 `FilterOperator`s) and its
   * sorts. Soft-deleted rows are included. Field names are view-model
   * properties; the query handler always adds a `groupId` equality filter.
   */
  findByCriteria(
    criteria: Criteria,
  ): Promise<PaginatedResult<PaymentViewModel>>;

  /** Every non-deleted payment of the group (used by the balance calculation). */
  findActiveByGroupId(groupId: string): Promise<PaymentViewModel[]>;
}
