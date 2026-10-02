import { PaymentViewModel } from '@contexts/payments/domain/view-models/payment.view-model';
import { IBaseReadRepository } from '@sisques-labs/nestjs-kit';

export const PAYMENT_READ_REPOSITORY = Symbol('PAYMENT_READ_REPOSITORY');

/**
 * Query view over the `payments` table. There is no separate projection store, so
 * `save` / `delete` are no-ops (the write side persists). `findByCriteria`
 * translates every filter of the criteria (all 8 `FilterOperator`s) and its
 * sorts; soft-deleted rows are included. Field names are view-model
 * properties; the query handler always adds a `groupId` equality filter.
 */
export interface IPaymentReadRepository extends IBaseReadRepository<PaymentViewModel> {
  /** Every non-deleted payment of the group (used by the balance calculation). */
  findActiveByGroupId(groupId: string): Promise<PaymentViewModel[]>;
}
