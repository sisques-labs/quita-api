import { GroupInvitationCodeAggregate } from '@contexts/group-invitation-codes/domain/aggregates/group-invitation-code.aggregate';
import { GroupInvitationCodeBuilder } from '@contexts/group-invitation-codes/domain/builders/group-invitation-code.builder';
import { GroupInvitationCodeViewModel } from '@contexts/group-invitation-codes/domain/view-models/group-invitation-code.view-model';
import { GroupInvitationCodeEntity } from '@contexts/group-invitation-codes/infrastructure/persistence/typeorm/entities/group-invitation-code.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GroupInvitationCodeTypeormMapper {
  constructor(
    private readonly groupInvitationCodeBuilder: GroupInvitationCodeBuilder,
  ) {}

  toAggregate(entity: GroupInvitationCodeEntity): GroupInvitationCodeAggregate {
    return this.toBuilder(entity).build();
  }

  toViewModel(entity: GroupInvitationCodeEntity): GroupInvitationCodeViewModel {
    return this.toBuilder(entity).buildViewModel();
  }

  toEntity(aggregate: GroupInvitationCodeAggregate): GroupInvitationCodeEntity {
    const primitives = aggregate.toPrimitives();
    return Object.assign(new GroupInvitationCodeEntity(), {
      id: primitives.id,
      groupId: primitives.groupId,
      code: primitives.code,
      createdBy: primitives.createdBy,
      revokedAt: primitives.revokedAt,
      createdAt: primitives.createdAt,
      updatedAt: primitives.updatedAt,
    });
  }

  private toBuilder(
    entity: GroupInvitationCodeEntity,
  ): GroupInvitationCodeBuilder {
    return this.groupInvitationCodeBuilder
      .withId(entity.id)
      .withGroupId(entity.groupId)
      .withCode(entity.code)
      .withCreatedBy(entity.createdBy)
      .withRevokedAt(entity.revokedAt)
      .withCreatedAt(entity.createdAt)
      .withUpdatedAt(entity.updatedAt);
  }
}
