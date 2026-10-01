import {
  PAYMENT_CURRENCY,
  PaymentAggregate,
} from '@contexts/payments/domain/aggregates/payment.aggregate';
import { PaymentAmountValueObject } from '@contexts/payments/domain/value-objects/payment-amount/payment-amount.value-object';
import { PaymentDateValueObject } from '@contexts/payments/domain/value-objects/payment-date/payment-date.value-object';
import { PaymentNoteValueObject } from '@contexts/payments/domain/value-objects/payment-note/payment-note.value-object';
import { PaymentUserIdValueObject } from '@contexts/payments/domain/value-objects/payment-user-id/payment-user-id.value-object';
import { PaymentViewModel } from '@contexts/payments/domain/view-models/payment.view-model';
import {
  BaseBuilder,
  DateValueObject,
  UuidValueObject,
} from '@sisques-labs/nestjs-kit';

/**
 * Hydrates a payment from raw values. It validates formats only: the "not in
 * the future" rule needs `today` and is enforced by `PaymentDateValueObject.create`.
 */
export class PaymentBuilder extends BaseBuilder<
  PaymentAggregate,
  PaymentViewModel
> {
  private _groupId = '';
  private _fromUserId = '';
  private _toUserId = '';
  private _amountCents = 0;
  private _paidOn = '';
  private _note: string | null = null;
  private _createdBy = '';
  private _updatedBy: string | null = null;
  private _deletedAt: Date | null = null;

  withGroupId(groupId: string): this {
    this._groupId = groupId;
    return this;
  }

  withFromUserId(fromUserId: string): this {
    this._fromUserId = fromUserId;
    return this;
  }

  withToUserId(toUserId: string): this {
    this._toUserId = toUserId;
    return this;
  }

  withAmountCents(amountCents: number): this {
    this._amountCents = amountCents;
    return this;
  }

  withPaidOn(paidOn: string): this {
    this._paidOn = paidOn;
    return this;
  }

  withNote(note: string | null): this {
    this._note = note;
    return this;
  }

  withCreatedBy(createdBy: string): this {
    this._createdBy = createdBy;
    return this;
  }

  /** Defaults to the creator. */
  withUpdatedBy(updatedBy: string): this {
    this._updatedBy = updatedBy;
    return this;
  }

  withDeletedAt(deletedAt: Date | null): this {
    this._deletedAt = deletedAt;
    return this;
  }

  build(): PaymentAggregate {
    this.validateWithDefaults();

    return new PaymentAggregate({
      id: new UuidValueObject(this._id),
      createdAt: new DateValueObject(this._createdAt),
      updatedAt: new DateValueObject(this._updatedAt),
      groupId: new UuidValueObject(this._groupId),
      fromUserId: new PaymentUserIdValueObject(this._fromUserId),
      toUserId: new PaymentUserIdValueObject(this._toUserId),
      amount: new PaymentAmountValueObject(this._amountCents),
      paidOn: new PaymentDateValueObject(this._paidOn),
      note: this.normalizedNote(),
      createdBy: new PaymentUserIdValueObject(this._createdBy),
      updatedBy: new PaymentUserIdValueObject(
        this._updatedBy ?? this._createdBy,
      ),
      deletedAt: this._deletedAt ? new DateValueObject(this._deletedAt) : null,
    });
  }

  buildViewModel(): PaymentViewModel {
    const aggregate = this.build();
    const primitives = aggregate.toPrimitives();

    return new PaymentViewModel({ ...primitives, currency: PAYMENT_CURRENCY });
  }

  private normalizedNote(): PaymentNoteValueObject | null {
    if (this._note === null || this._note.trim() === '') {
      return null;
    }
    return new PaymentNoteValueObject(this._note);
  }

  private validateWithDefaults(): void {
    this._createdAt ??= new Date();
    this._updatedAt ??= this._createdAt;
    this.validate();
  }
}
