import { PAYMENT_NOTE_MAX_LENGTH } from '@contexts/payments/domain/constants/payment-note-max-length.constant';
import { StringValueObject } from '@sisques-labs/nestjs-kit';

/** Free-text note: trimmed and at most 200 characters. */
export class PaymentNoteValueObject extends StringValueObject {
  constructor(value: string) {
    super(value.trim(), {
      minLength: 1,
      maxLength: PAYMENT_NOTE_MAX_LENGTH,
      allowEmpty: false,
    });
  }
}
