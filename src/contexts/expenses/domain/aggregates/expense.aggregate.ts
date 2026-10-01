import { EXPENSE_CURRENCY } from '@contexts/expenses/domain/constants/expense-currency.constant';
import { ExpenseCategory } from '@contexts/expenses/domain/enums/expense-category.enum';
import { ExpenseSplitType } from '@contexts/expenses/domain/enums/expense-split-type.enum';
import { ExpenseCreatedEvent } from '@contexts/expenses/domain/events/expense-created/expense-created.event';
import { ExpenseDeletedEvent } from '@contexts/expenses/domain/events/expense-deleted/expense-deleted.event';
import { ExpenseUpdatedEvent } from '@contexts/expenses/domain/events/expense-updated/expense-updated.event';
import { ExpenseAlreadyDeletedException } from '@contexts/expenses/domain/exceptions/expense-already-deleted.exception';
import { IExpense } from '@contexts/expenses/domain/interfaces/expense.interface';
import { IExpensePrimitives } from '@contexts/expenses/domain/primitives/expense.primitives';
import { ExpenseAmountValueObject } from '@contexts/expenses/domain/value-objects/expense-amount/expense-amount.value-object';
import { ExpenseCategoryValueObject } from '@contexts/expenses/domain/value-objects/expense-category/expense-category.value-object';
import { ExpenseDateValueObject } from '@contexts/expenses/domain/value-objects/expense-date/expense-date.value-object';
import { ExpenseDescriptionValueObject } from '@contexts/expenses/domain/value-objects/expense-description/expense-description.value-object';
import { ExpenseSplitTypeValueObject } from '@contexts/expenses/domain/value-objects/expense-split-type/expense-split-type.value-object';
import { ExpenseUserIdValueObject } from '@contexts/expenses/domain/value-objects/expense-user-id/expense-user-id.value-object';
import {
  BaseAggregate,
  DateValueObject,
  UuidValueObject,
} from '@sisques-labs/nestjs-kit';

/**
 * Fields a member may change. An omitted key keeps the current value;
 * `description` and `category` accept `null` to clear them.
 */
export interface ExpenseChanges {
  amountCents?: number;
  paidBy?: string;
  spentOn?: string;
  description?: string | null;
  category?: ExpenseCategory | null;
  splitType?: ExpenseSplitType;
}

/** A shared expense paid by one member and split between the group's two members. */
export class ExpenseAggregate extends BaseAggregate {
  private readonly _groupId: UuidValueObject;
  private _amount: ExpenseAmountValueObject;
  private _paidBy: ExpenseUserIdValueObject;
  private _spentOn: ExpenseDateValueObject;
  private _description: ExpenseDescriptionValueObject | null;
  private _category: ExpenseCategoryValueObject | null;
  private _splitType: ExpenseSplitTypeValueObject;
  private readonly _createdBy: ExpenseUserIdValueObject;
  private _updatedBy: ExpenseUserIdValueObject;
  private _deletedAt: DateValueObject | null;

  constructor(props: IExpense) {
    super(props.id, props.createdAt, props.updatedAt);
    this._groupId = props.groupId;
    this._amount = props.amount;
    this._paidBy = props.paidBy;
    this._spentOn = props.spentOn;
    this._description = props.description;
    this._category = props.category;
    this._splitType = props.splitType;
    this._createdBy = props.createdBy;
    this._updatedBy = props.updatedBy;
    this._deletedAt = props.deletedAt;
  }

  create(): void {
    this.apply(
      new ExpenseCreatedEvent(
        this.generateEventMetadata(ExpenseCreatedEvent),
        this.toPrimitives(),
      ),
    );
  }

  /**
   * Applies `changes` on behalf of any group member. `today` comes from the
   * core clock so the "not in the future" rule holds on edit as well as on
   * create. Every change is validated before any is applied.
   */
  update(changes: ExpenseChanges, updatedBy: string, today: string): void {
    this.assertNotDeleted();

    const amount =
      changes.amountCents === undefined
        ? this._amount
        : new ExpenseAmountValueObject(changes.amountCents);
    const paidBy =
      changes.paidBy === undefined
        ? this._paidBy
        : new ExpenseUserIdValueObject(changes.paidBy);
    const spentOn =
      changes.spentOn === undefined
        ? this._spentOn
        : ExpenseDateValueObject.create(changes.spentOn, today);
    const description =
      changes.description === undefined
        ? this._description
        : ExpenseAggregate.toDescription(changes.description);
    const category =
      changes.category === undefined
        ? this._category
        : ExpenseAggregate.toCategory(changes.category);
    const splitType =
      changes.splitType === undefined
        ? this._splitType
        : new ExpenseSplitTypeValueObject(changes.splitType);
    const editor = new ExpenseUserIdValueObject(updatedBy);

    this._amount = amount;
    this._paidBy = paidBy;
    this._spentOn = spentOn;
    this._description = description;
    this._category = category;
    this._splitType = splitType;
    this._updatedBy = editor;
    this.touch();
    this.apply(
      new ExpenseUpdatedEvent(
        this.generateEventMetadata(ExpenseUpdatedEvent),
        this.toPrimitives(),
      ),
    );
  }

  /** Soft delete: the expense stays in history flagged with `deletedAt`. */
  delete(deletedBy: string, at: Date): void {
    this.assertNotDeleted();

    this._updatedBy = new ExpenseUserIdValueObject(deletedBy);
    this._deletedAt = new DateValueObject(at);
    this.touch();
    this.apply(
      new ExpenseDeletedEvent(
        this.generateEventMetadata(ExpenseDeletedEvent),
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

  get amount(): ExpenseAmountValueObject {
    return this._amount;
  }

  get paidBy(): ExpenseUserIdValueObject {
    return this._paidBy;
  }

  get spentOn(): ExpenseDateValueObject {
    return this._spentOn;
  }

  get description(): ExpenseDescriptionValueObject | null {
    return this._description;
  }

  get category(): ExpenseCategoryValueObject | null {
    return this._category;
  }

  get splitType(): ExpenseSplitTypeValueObject {
    return this._splitType;
  }

  get createdBy(): ExpenseUserIdValueObject {
    return this._createdBy;
  }

  get updatedBy(): ExpenseUserIdValueObject {
    return this._updatedBy;
  }

  get deletedAt(): DateValueObject | null {
    return this._deletedAt;
  }

  toPrimitives(): IExpensePrimitives {
    return {
      id: this.id.value,
      groupId: this._groupId.value,
      amountCents: this._amount.value,
      currency: EXPENSE_CURRENCY,
      paidBy: this._paidBy.value,
      spentOn: this._spentOn.value,
      description: this._description?.value ?? null,
      category: (this._category?.value as ExpenseCategory | undefined) ?? null,
      splitType: this._splitType.value as ExpenseSplitType,
      createdBy: this._createdBy.value,
      updatedBy: this._updatedBy.value,
      deletedAt: this._deletedAt?.value ?? null,
      createdAt: this.createdAt.value,
      updatedAt: this.updatedAt.value,
    };
  }

  private assertNotDeleted(): void {
    if (this.isDeleted()) {
      throw new ExpenseAlreadyDeletedException(this.id.value);
    }
  }

  private static toDescription(
    value: string | null,
  ): ExpenseDescriptionValueObject | null {
    return value === null || value.trim() === ''
      ? null
      : new ExpenseDescriptionValueObject(value);
  }

  private static toCategory(
    value: ExpenseCategory | null,
  ): ExpenseCategoryValueObject | null {
    return value === null ? null : new ExpenseCategoryValueObject(value);
  }
}
