import { GroupMembershipAggregate } from '@contexts/group-members/domain/aggregates/group-membership.aggregate';
import { GroupMembershipBuilder } from '@contexts/group-members/domain/builders/group-membership.builder';
import { GroupMembershipViewModel } from '@contexts/group-members/domain/view-models/group-membership.view-model';
import { GroupMemberEntity } from '@contexts/group-members/infrastructure/persistence/typeorm/entities/group-member.entity';
import { GroupMembershipEntity } from '@contexts/group-members/infrastructure/persistence/typeorm/entities/group-membership.entity';
import { Injectable } from '@nestjs/common';

/**
 * A roster spans two tables, so this mapper takes the pair of rows instead of
 * extending `BaseTypeOrmMapper` (which assumes one row per aggregate).
 */
@Injectable()
export class GroupMembershipTypeormMapper {
  constructor(
    private readonly groupMembershipBuilder: GroupMembershipBuilder,
  ) {}

  toAggregate(
    membership: GroupMembershipEntity,
    members: GroupMemberEntity[],
  ): GroupMembershipAggregate {
    return this.toBuilder(membership, members).build();
  }

  toViewModel(
    membership: GroupMembershipEntity,
    members: GroupMemberEntity[],
  ): GroupMembershipViewModel {
    return this.toBuilder(membership, members).buildViewModel();
  }

  private toBuilder(
    membership: GroupMembershipEntity,
    members: GroupMemberEntity[],
  ): GroupMembershipBuilder {
    return this.groupMembershipBuilder
      .withId(membership.groupId)
      .withCapacity(membership.capacity)
      .withVersion(membership.version)
      .withCreatedAt(membership.createdAt)
      .withUpdatedAt(membership.updatedAt)
      .withMembers(
        members.map((member) => ({
          userId: member.userId,
          role: member.role,
          joinedAt: member.joinedAt,
        })),
      );
  }
}
