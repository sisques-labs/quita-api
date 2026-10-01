import { PaymentAggregate } from '@contexts/payments/domain/aggregates/payment.aggregate';
import { PaymentBuilder } from '@contexts/payments/domain/builders/payment.builder';
import { PaymentViewModel } from '@contexts/payments/domain/view-models/payment.view-model';
import { PaymentEntity } from '@contexts/payments/infrastructure/persistence/typeorm/entities/payment.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PaymentTypeormMapper {
  toAggregate(entity: PaymentEntity): PaymentAggregate {
    return this.toBuilder(entity).build();
  }

  toViewModel(entity: PaymentEntity): PaymentViewModel {
    return this.toBuilder(entity).buildViewModel();
  }

  toEntity(aggregate: PaymentAggregate): PaymentEntity {
    const primitives = aggregate.toPrimitives();
    return Object.assign(new PaymentEntity(), {
      id: primitives.id,
      groupId: primitives.groupId,
      fromUserId: primitives.fromUserId,
      toUserId: primitives.toUserId,
      amountCents: primitives.amountCents,
      currency: primitives.currency,
      paidOn: primitives.paidOn,
      note: primitives.note,
      createdBy: primitives.createdBy,
      updatedBy: primitives.updatedBy,
      deletedAt: primitives.deletedAt,
      createdAt: primitives.createdAt,
      updatedAt: primitives.updatedAt,
    });
  }

  private toBuilder(entity: PaymentEntity): PaymentBuilder {
    return new PaymentBuilder()
      .withId(entity.id)
      .withGroupId(entity.groupId)
      .withFromUserId(entity.fromUserId)
      .withToUserId(entity.toUserId)
      .withAmountCents(entity.amountCents)
      .withPaidOn(entity.paidOn)
      .withNote(entity.note)
      .withCreatedBy(entity.createdBy)
      .withUpdatedBy(entity.updatedBy)
      .withDeletedAt(entity.deletedAt)
      .withCreatedAt(entity.createdAt)
      .withUpdatedAt(entity.updatedAt);
  }
}
