import { PaymentUserIdValueObject } from '@contexts/payments/domain/value-objects/payment-user-id/payment-user-id.value-object';
import { UuidValueObject } from '@sisques-labs/nestjs-kit';

export interface DeletePaymentCommandInput {
  paymentId: string;
  groupId: string;
  requesterId: string;
}

export class DeletePaymentCommand {
  readonly paymentId: UuidValueObject;
  readonly groupId: UuidValueObject;
  readonly requesterId: PaymentUserIdValueObject;

  constructor(input: DeletePaymentCommandInput) {
    this.paymentId = new UuidValueObject(input.paymentId);
    this.groupId = new UuidValueObject(input.groupId);
    this.requesterId = new PaymentUserIdValueObject(input.requesterId);
  }
}
