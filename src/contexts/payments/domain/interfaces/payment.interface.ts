import { PaymentAmountValueObject } from '@contexts/payments/domain/value-objects/payment-amount/payment-amount.value-object';
import { PaymentDateValueObject } from '@contexts/payments/domain/value-objects/payment-date/payment-date.value-object';
import { PaymentNoteValueObject } from '@contexts/payments/domain/value-objects/payment-note/payment-note.value-object';
import { PaymentUserIdValueObject } from '@contexts/payments/domain/value-objects/payment-user-id/payment-user-id.value-object';
import {
  DateValueObject,
  IBaseAggregate,
  UuidValueObject,
} from '@sisques-labs/nestjs-kit';

export interface IPayment extends IBaseAggregate {
  groupId: UuidValueObject;
  fromUserId: PaymentUserIdValueObject;
  toUserId: PaymentUserIdValueObject;
  amount: PaymentAmountValueObject;
  paidOn: PaymentDateValueObject;
  note: PaymentNoteValueObject | null;
  createdBy: PaymentUserIdValueObject;
  updatedBy: PaymentUserIdValueObject;
  deletedAt: DateValueObject | null;
}
