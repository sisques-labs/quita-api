import {
  GROUP_MEMBERS_PORT,
  GroupMembersPort,
} from '@contexts/balances/application/ports/group-members.port';
import { BalanceAccessDeniedException } from '@contexts/balances/domain/exceptions/balance-access-denied.exception';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class AssertRequesterIsGroupMemberService {
  constructor(
    @Inject(GROUP_MEMBERS_PORT)
    private readonly membersPort: GroupMembersPort,
  ) {}

  async execute(groupId: string, requesterId: string): Promise<void> {
    const isMember = await this.membersPort.isMember(groupId, requesterId);
    if (!isMember) {
      throw new BalanceAccessDeniedException(requesterId, groupId);
    }
  }
}
