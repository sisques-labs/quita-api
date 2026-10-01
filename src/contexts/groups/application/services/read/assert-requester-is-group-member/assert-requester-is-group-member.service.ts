import {
  GROUP_MEMBERSHIP_PORT,
  GroupMembershipPort,
} from '@contexts/groups/application/ports/group-membership.port';
import { GroupAccessDeniedException } from '@contexts/groups/domain/exceptions/group-access-denied.exception';
import { Inject, Injectable } from '@nestjs/common';
import { StringValueObject, UuidValueObject } from '@sisques-labs/nestjs-kit';

/**
 * Not `IBaseService` — that interface is single-input, and this assertion
 * inherently needs two (groupId + requesterId).
 */
@Injectable()
export class AssertRequesterIsGroupMemberService {
  constructor(
    @Inject(GROUP_MEMBERSHIP_PORT)
    private readonly membershipPort: GroupMembershipPort,
  ) {}

  async execute(
    groupId: UuidValueObject,
    requesterId: StringValueObject,
  ): Promise<void> {
    const isMember = await this.membershipPort.isMember(
      groupId.value,
      requesterId.value,
    );
    if (!isMember) {
      throw new GroupAccessDeniedException(requesterId.value, groupId.value);
    }
  }
}
