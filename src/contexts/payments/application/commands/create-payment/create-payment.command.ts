import { PaymentAmountValueObject } from '@contexts/payments/domain/value-objects/payment-amount/payment-amount.value-object';
import { PaymentDateValueObject } from '@contexts/payments/domain/value-objects/payment-date/payment-date.value-object';
import { PaymentNoteValueObject } from '@contexts/payments/domain/value-objects/payment-note/payment-note.value-object';
import { PaymentUserIdValueObject } from '@contexts/payments/domain/value-objects/payment-user-id/payment-user-id.value-object';
import { UuidValueObject } from '@sisques-labs/nestjs-kit';

export interface CreatePaymentCommandInput {
  groupId: string;
  requesterId: string;
  fromUserId: string;
  toUserId: string;
  amountCents: number;
  paidOn: string;
  note?: string | null;
}

export class CreatePaymentCommand {
  readonly groupId: UuidValueObject;
  readonly requesterId: PaymentUserIdValueObject;
  /** Member who paid. */
  readonly fromUserId: PaymentUserIdValueObject;
  /** Member who received the money. */
  readonly toUserId: PaymentUserIdValueObject;
  readonly amount: PaymentAmountValueObject;
  /** Format-checked only; the handler enforces "not in the future" with the clock. */
  readonly paidOn: PaymentDateValueObject;
  readonly note: PaymentNoteValueObject | null;

  constructor(input: CreatePaymentCommandInput) {
    this.groupId = new UuidValueObject(input.groupId);
    this.requesterId = new PaymentUserIdValueObject(input.requesterId);
    this.fromUserId = new PaymentUserIdValueObject(input.fromUserId);
    this.toUserId = new PaymentUserIdValueObject(input.toUserId);
    this.amount = new PaymentAmountValueObject(input.amountCents);
    this.paidOn = new PaymentDateValueObject(input.paidOn);
    this.note = input.note?.trim()
      ? new PaymentNoteValueObject(input.note)
      : null;
  }
}
