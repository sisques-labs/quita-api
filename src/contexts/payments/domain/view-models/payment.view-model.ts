import { BaseViewModel } from '@sisques-labs/nestjs-kit';

/** Read-side projection of a payment; soft-deleted rows carry `deletedAt`. */
export class PaymentViewModel extends BaseViewModel {
  constructor(
    id: string,
    createdAt: Date,
    updatedAt: Date,
    readonly groupId: string,
    readonly fromUserId: string,
    readonly toUserId: string,
    readonly amountCents: number,
    readonly currency: string,
    readonly paidOn: string,
    readonly note: string | null,
    readonly createdBy: string,
    readonly updatedBy: string,
    readonly deletedAt: Date | null,
  ) {
    super(id, createdAt, updatedAt);
  }
}
