import { GroupMemberRole } from '@contexts/group-members/domain/enums/group-member-role.enum';
import { GroupMembershipViewModel } from '@contexts/group-members/domain/view-models/group-membership.view-model';
import { GroupMemberObject } from '@contexts/group-members/transport/graphql/objects/group-member.object';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GroupMemberGraphQLMapper {
  toObjects(viewModel: GroupMembershipViewModel): GroupMemberObject[] {
    return viewModel.members.map((member) => ({
      userId: member.userId,
      role: member.role as GroupMemberRole,
      joinedAt: member.joinedAt,
    }));
  }
}
