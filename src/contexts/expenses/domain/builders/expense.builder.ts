import {
  EXPENSE_CURRENCY,
  ExpenseAggregate,
} from '@contexts/expenses/domain/aggregates/expense.aggregate';
import { ExpenseSplitType } from '@contexts/expenses/domain/enums/expense-split-type.enum';
import { ExpenseAmountValueObject } from '@contexts/expenses/domain/value-objects/expense-amount/expense-amount.value-object';
import { ExpenseCategoryValueObject } from '@contexts/expenses/domain/value-objects/expense-category/expense-category.value-object';
import { ExpenseDateValueObject } from '@contexts/expenses/domain/value-objects/expense-date/expense-date.value-object';
import { ExpenseDescriptionValueObject } from '@contexts/expenses/domain/value-objects/expense-description/expense-description.value-object';
import { ExpenseSplitTypeValueObject } from '@contexts/expenses/domain/value-objects/expense-split-type/expense-split-type.value-object';
import { ExpenseUserIdValueObject } from '@contexts/expenses/domain/value-objects/expense-user-id/expense-user-id.value-object';
import { ExpenseViewModel } from '@contexts/expenses/domain/view-models/expense.view-model';
import {
  BaseBuilder,
  DateValueObject,
  UuidValueObject,
} from '@sisques-labs/nestjs-kit';

/**
 * Hydrates an expense from raw values. It validates formats only: the "not in
 * the future" rule needs `today` and is enforced by `ExpenseDateValueObject.create`.
 */
export class ExpenseBuilder extends BaseBuilder<
  ExpenseAggregate,
  ExpenseViewModel
> {
  private _groupId = '';
  private _amountCents = 0;
  private _paidBy = '';
  private _spentOn = '';
  private _description: string | null = null;
  private _category: string | null = null;
  private _splitType: string = ExpenseSplitType.EQUAL;
  private _createdBy = '';
  private _updatedBy: string | null = null;
  private _deletedAt: Date | null = null;

  withGroupId(groupId: string): this {
    this._groupId = groupId;
    return this;
  }

  withAmountCents(amountCents: number): this {
    this._amountCents = amountCents;
    return this;
  }

  withPaidBy(paidBy: string): this {
    this._paidBy = paidBy;
    return this;
  }

  withSpentOn(spentOn: string): this {
    this._spentOn = spentOn;
    return this;
  }

  withDescription(description: string | null): this {
    this._description = description;
    return this;
  }

  withCategory(category: string | null): this {
    this._category = category;
    return this;
  }

  withSplitType(splitType: string): this {
    this._splitType = splitType;
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

  build(): ExpenseAggregate {
    this.validateWithDefaults();

    return new ExpenseAggregate({
      id: new UuidValueObject(this._id),
      createdAt: new DateValueObject(this._createdAt),
      updatedAt: new DateValueObject(this._updatedAt),
      groupId: new UuidValueObject(this._groupId),
      amount: new ExpenseAmountValueObject(this._amountCents),
      paidBy: new ExpenseUserIdValueObject(this._paidBy),
      spentOn: new ExpenseDateValueObject(this._spentOn),
      description: this.normalizedDescription(),
      category: this._category
        ? new ExpenseCategoryValueObject(this._category)
        : null,
      splitType: new ExpenseSplitTypeValueObject(this._splitType),
      createdBy: new ExpenseUserIdValueObject(this._createdBy),
      updatedBy: new ExpenseUserIdValueObject(
        this._updatedBy ?? this._createdBy,
      ),
      deletedAt: this._deletedAt ? new DateValueObject(this._deletedAt) : null,
    });
  }

  buildViewModel(): ExpenseViewModel {
    const aggregate = this.build();
    const primitives = aggregate.toPrimitives();

    return new ExpenseViewModel(
      primitives.id,
      primitives.createdAt,
      primitives.updatedAt,
      primitives.groupId,
      primitives.amountCents,
      EXPENSE_CURRENCY,
      primitives.paidBy,
      primitives.spentOn,
      primitives.description,
      primitives.category,
      primitives.splitType,
      primitives.createdBy,
      primitives.updatedBy,
      primitives.deletedAt,
    );
  }

  private normalizedDescription(): ExpenseDescriptionValueObject | null {
    if (this._description === null || this._description.trim() === '') {
      return null;
    }
    return new ExpenseDescriptionValueObject(this._description);
  }

  private validateWithDefaults(): void {
    this._createdAt ??= new Date();
    this._updatedAt ??= this._createdAt;
    this.validate();
  }
}
