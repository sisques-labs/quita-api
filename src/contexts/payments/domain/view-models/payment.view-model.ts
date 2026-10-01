import { PaymentPrimitives } from '@contexts/payments/domain/primitives/payment.primitives';
import { BaseViewModel } from '@sisques-labs/nestjs-kit';

/** Read-side projection of a payment; soft-deleted rows carry `deletedAt`. */
export class PaymentViewModel extends BaseViewModel {
  readonly groupId: string;
  readonly fromUserId: string;
  readonly toUserId: string;
  readonly amountCents: number;
  readonly currency: string;
  readonly paidOn: string;
  readonly note: string | null;
  readonly createdBy: string;
  readonly updatedBy: string;
  readonly deletedAt: Date | null;

  constructor(props: PaymentPrimitives) {
    super(props.id, props.createdAt, props.updatedAt);
    this.groupId = props.groupId;
    this.fromUserId = props.fromUserId;
    this.toUserId = props.toUserId;
    this.amountCents = props.amountCents;
    this.currency = props.currency;
    this.paidOn = props.paidOn;
    this.note = props.note;
    this.createdBy = props.createdBy;
    this.updatedBy = props.updatedBy;
    this.deletedAt = props.deletedAt;
  }
}
