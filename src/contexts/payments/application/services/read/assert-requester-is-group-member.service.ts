import {
  GROUP_MEMBERS_PORT,
  GroupMembersPort,
} from '@contexts/payments/application/ports/group-members.port';
import { PaymentAccessDeniedException } from '@contexts/payments/domain/exceptions/payment-access-denied.exception';
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
      throw new PaymentAccessDeniedException(requesterId, groupId);
    }
  }
}
