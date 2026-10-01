import { PaymentChanges } from '@contexts/payments/domain/aggregates/payment.aggregate';
import { PaymentAmountValueObject } from '@contexts/payments/domain/value-objects/payment-amount/payment-amount.value-object';
import { PaymentDateValueObject } from '@contexts/payments/domain/value-objects/payment-date/payment-date.value-object';
import { PaymentNoteValueObject } from '@contexts/payments/domain/value-objects/payment-note/payment-note.value-object';
import { PaymentUserIdValueObject } from '@contexts/payments/domain/value-objects/payment-user-id/payment-user-id.value-object';
import { UuidValueObject } from '@sisques-labs/nestjs-kit';

/**
 * Omitted (`undefined`) fields keep their value; `note` accepts `null` to
 * clear it.
 */
export interface EditPaymentCommandInput {
  paymentId: string;
  groupId: string;
  requesterId: string;
  amountCents?: number;
  fromUserId?: string;
  toUserId?: string;
  paidOn?: string;
  note?: string | null;
}

export class EditPaymentCommand {
  readonly paymentId: UuidValueObject;
  readonly groupId: UuidValueObject;
  readonly requesterId: PaymentUserIdValueObject;
  /** Every present change has been validated by its value object. */
  readonly changes: PaymentChanges;

  constructor(input: EditPaymentCommandInput) {
    this.paymentId = new UuidValueObject(input.paymentId);
    this.groupId = new UuidValueObject(input.groupId);
    this.requesterId = new PaymentUserIdValueObject(input.requesterId);
    this.changes = EditPaymentCommand.validatedChanges(input);
  }

  private static validatedChanges(
    input: EditPaymentCommandInput,
  ): PaymentChanges {
    const changes: PaymentChanges = {};
    if (input.amountCents !== undefined) {
      changes.amountCents = new PaymentAmountValueObject(
        input.amountCents,
      ).value;
    }
    if (input.fromUserId !== undefined) {
      changes.fromUserId = new PaymentUserIdValueObject(input.fromUserId).value;
    }
    if (input.toUserId !== undefined) {
      changes.toUserId = new PaymentUserIdValueObject(input.toUserId).value;
    }
    if (input.paidOn !== undefined) {
      // Format only; "not in the future" is enforced by the aggregate with the clock.
      changes.paidOn = new PaymentDateValueObject(input.paidOn).value;
    }
    if (input.note !== undefined) {
      changes.note = input.note?.trim()
        ? new PaymentNoteValueObject(input.note).value
        : null;
    }
    return changes;
  }
}
