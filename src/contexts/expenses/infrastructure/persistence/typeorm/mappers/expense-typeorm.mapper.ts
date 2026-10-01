import { ExpenseAggregate } from '@contexts/expenses/domain/aggregates/expense.aggregate';
import { ExpenseBuilder } from '@contexts/expenses/domain/builders/expense.builder';
import { ExpenseViewModel } from '@contexts/expenses/domain/view-models/expense.view-model';
import { ExpenseEntity } from '@contexts/expenses/infrastructure/persistence/typeorm/entities/expense.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ExpenseTypeormMapper {
  toAggregate(entity: ExpenseEntity): ExpenseAggregate {
    return this.toBuilder(entity).build();
  }

  toViewModel(entity: ExpenseEntity): ExpenseViewModel {
    return this.toBuilder(entity).buildViewModel();
  }

  toEntity(aggregate: ExpenseAggregate): ExpenseEntity {
    const primitives = aggregate.toPrimitives();
    return Object.assign(new ExpenseEntity(), {
      id: primitives.id,
      groupId: primitives.groupId,
      amountCents: primitives.amountCents,
      currency: primitives.currency,
      paidBy: primitives.paidBy,
      spentOn: primitives.spentOn,
      description: primitives.description,
      category: primitives.category,
      splitType: primitives.splitType,
      createdBy: primitives.createdBy,
      updatedBy: primitives.updatedBy,
      deletedAt: primitives.deletedAt,
      createdAt: primitives.createdAt,
      updatedAt: primitives.updatedAt,
    });
  }

  private toBuilder(entity: ExpenseEntity): ExpenseBuilder {
    return new ExpenseBuilder()
      .withId(entity.id)
      .withGroupId(entity.groupId)
      .withAmountCents(entity.amountCents)
      .withPaidBy(entity.paidBy)
      .withSpentOn(entity.spentOn)
      .withDescription(entity.description)
      .withCategory(entity.category)
      .withSplitType(entity.splitType)
      .withCreatedBy(entity.createdBy)
      .withUpdatedBy(entity.updatedBy)
      .withDeletedAt(entity.deletedAt)
      .withCreatedAt(entity.createdAt)
      .withUpdatedAt(entity.updatedAt);
  }
}
