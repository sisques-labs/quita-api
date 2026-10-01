import { GroupMemberRole } from '@contexts/group-members/domain/enums/group-member-role.enum';
import { GroupMembershipViewModel } from '@contexts/group-members/domain/view-models/group-membership.view-model';
import { GroupMemberResponseDto } from '@contexts/group-members/transport/graphql/dtos/responses/group-member.response.dto';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GroupMemberGraphQLMapper {
  toResponseDtosFromViewModel(
    viewModel: GroupMembershipViewModel,
  ): GroupMemberResponseDto[] {
    return viewModel.members.map((member) => ({
      userId: member.userId,
      role: member.role as GroupMemberRole,
      joinedAt: member.joinedAt,
    }));
  }
}
