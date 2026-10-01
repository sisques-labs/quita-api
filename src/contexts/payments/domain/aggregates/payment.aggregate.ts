import { PAYMENT_CURRENCY } from '@contexts/payments/domain/constants/payment-currency.constant';
import { PaymentCreatedEvent } from '@contexts/payments/domain/events/payment-created/payment-created.event';
import { PaymentDeletedEvent } from '@contexts/payments/domain/events/payment-deleted/payment-deleted.event';
import { PaymentUpdatedEvent } from '@contexts/payments/domain/events/payment-updated/payment-updated.event';
import { PaymentAlreadyDeletedException } from '@contexts/payments/domain/exceptions/payment-already-deleted.exception';
import { PaymentPartiesMustDifferException } from '@contexts/payments/domain/exceptions/payment-parties-must-differ.exception';
import { IPayment } from '@contexts/payments/domain/interfaces/payment.interface';
import { PaymentPrimitives } from '@contexts/payments/domain/primitives/payment.primitives';
import { PaymentAmountValueObject } from '@contexts/payments/domain/value-objects/payment-amount/payment-amount.value-object';
import { PaymentDateValueObject } from '@contexts/payments/domain/value-objects/payment-date/payment-date.value-object';
import { PaymentNoteValueObject } from '@contexts/payments/domain/value-objects/payment-note/payment-note.value-object';
import { PaymentUserIdValueObject } from '@contexts/payments/domain/value-objects/payment-user-id/payment-user-id.value-object';
import {
  BaseAggregate,
  DateValueObject,
  UuidValueObject,
} from '@sisques-labs/nestjs-kit';

/**
 * Fields a member may change. An omitted key keeps the current value;
 * `note` accepts `null` to clear it.
 */
export interface PaymentChanges {
  amountCents?: number;
  fromUserId?: string;
  toUserId?: string;
  paidOn?: string;
  note?: string | null;
}

/** A settlement in which one group member paid the other ("I paid you X"). */
export class PaymentAggregate extends BaseAggregate {
  private readonly _groupId: UuidValueObject;
  private _fromUserId: PaymentUserIdValueObject;
  private _toUserId: PaymentUserIdValueObject;
  private _amount: PaymentAmountValueObject;
  private _paidOn: PaymentDateValueObject;
  private _note: PaymentNoteValueObject | null;
  private readonly _createdBy: PaymentUserIdValueObject;
  private _updatedBy: PaymentUserIdValueObject;
  private _deletedAt: DateValueObject | null;

  constructor(props: IPayment) {
    super(props.id, props.createdAt, props.updatedAt);
    PaymentAggregate.assertDistinctParties(props.fromUserId, props.toUserId);
    this._groupId = props.groupId;
    this._fromUserId = props.fromUserId;
    this._toUserId = props.toUserId;
    this._amount = props.amount;
    this._paidOn = props.paidOn;
    this._note = props.note;
    this._createdBy = props.createdBy;
    this._updatedBy = props.updatedBy;
    this._deletedAt = props.deletedAt;
  }

  create(): void {
    this.apply(
      new PaymentCreatedEvent(
        this.generateEventMetadata(PaymentCreatedEvent),
        this.toPrimitives(),
      ),
    );
  }

  /**
   * Applies `changes` on behalf of any group member. `today` comes from the
   * core clock so the "not in the future" rule holds on edit as well as on
   * create. Every change is validated before any is applied.
   */
  update(changes: PaymentChanges, updatedBy: string, today: string): void {
    this.assertNotDeleted();

    const amount =
      changes.amountCents === undefined
        ? this._amount
        : new PaymentAmountValueObject(changes.amountCents);
    const fromUserId =
      changes.fromUserId === undefined
        ? this._fromUserId
        : new PaymentUserIdValueObject(changes.fromUserId);
    const toUserId =
      changes.toUserId === undefined
        ? this._toUserId
        : new PaymentUserIdValueObject(changes.toUserId);
    const paidOn =
      changes.paidOn === undefined
        ? this._paidOn
        : PaymentDateValueObject.create(changes.paidOn, today);
    const note =
      changes.note === undefined
        ? this._note
        : PaymentAggregate.toNote(changes.note);
    const editor = new PaymentUserIdValueObject(updatedBy);
    PaymentAggregate.assertDistinctParties(fromUserId, toUserId);

    this._amount = amount;
    this._fromUserId = fromUserId;
    this._toUserId = toUserId;
    this._paidOn = paidOn;
    this._note = note;
    this._updatedBy = editor;
    this.touch();
    this.apply(
      new PaymentUpdatedEvent(
        this.generateEventMetadata(PaymentUpdatedEvent),
        this.toPrimitives(),
      ),
    );
  }

  /** Soft delete: the payment stays in history flagged with `deletedAt`. */
  delete(deletedBy: string, at: Date): void {
    this.assertNotDeleted();

    this._updatedBy = new PaymentUserIdValueObject(deletedBy);
    this._deletedAt = new DateValueObject(at);
    this.touch();
    this.apply(
      new PaymentDeletedEvent(
        this.generateEventMetadata(PaymentDeletedEvent),
        this.toPrimitives(),
      ),
    );
  }

  isDeleted(): boolean {
    return this._deletedAt !== null;
  }

  get groupId(): UuidValueObject {
    return this._groupId;
  }

  get fromUserId(): PaymentUserIdValueObject {
    return this._fromUserId;
  }

  get toUserId(): PaymentUserIdValueObject {
    return this._toUserId;
  }

  get amount(): PaymentAmountValueObject {
    return this._amount;
  }

  get paidOn(): PaymentDateValueObject {
    return this._paidOn;
  }

  get note(): PaymentNoteValueObject | null {
    return this._note;
  }

  get createdBy(): PaymentUserIdValueObject {
    return this._createdBy;
  }

  get updatedBy(): PaymentUserIdValueObject {
    return this._updatedBy;
  }

  get deletedAt(): DateValueObject | null {
    return this._deletedAt;
  }

  toPrimitives(): PaymentPrimitives {
    return {
      id: this.id.value,
      groupId: this._groupId.value,
      fromUserId: this._fromUserId.value,
      toUserId: this._toUserId.value,
      amountCents: this._amount.value,
      currency: PAYMENT_CURRENCY,
      paidOn: this._paidOn.value,
      note: this._note?.value ?? null,
      createdBy: this._createdBy.value,
      updatedBy: this._updatedBy.value,
      deletedAt: this._deletedAt?.value ?? null,
      createdAt: this.createdAt.value,
      updatedAt: this.updatedAt.value,
    };
  }

  private assertNotDeleted(): void {
    if (this.isDeleted()) {
      throw new PaymentAlreadyDeletedException(this.id.value);
    }
  }

  private static assertDistinctParties(
    from: PaymentUserIdValueObject,
    to: PaymentUserIdValueObject,
  ): void {
    if (from.value === to.value) {
      throw new PaymentPartiesMustDifferException(from.value);
    }
  }

  private static toNote(value: string | null): PaymentNoteValueObject | null {
    return value === null || value.trim() === ''
      ? null
      : new PaymentNoteValueObject(value);
  }
}
