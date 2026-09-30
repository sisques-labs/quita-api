import {
  GROUP_MEMBERSHIP_PORT,
  GroupMembershipPort,
} from '@contexts/groups/application/ports/group-membership.port';
import { GroupAccessDeniedException } from '@contexts/groups/domain/exceptions/group-access-denied.exception';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class AssertRequesterIsGroupMemberService {
  constructor(
    @Inject(GROUP_MEMBERSHIP_PORT)
    private readonly membershipPort: GroupMembershipPort,
  ) {}

  async execute(groupId: string, requesterId: string): Promise<void> {
    const isMember = await this.membershipPort.isMember(groupId, requesterId);
    if (!isMember) {
      throw new GroupAccessDeniedException(requesterId, groupId);
    }
  }
}
