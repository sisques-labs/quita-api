import {
  GROUP_MEMBERS_PORT,
  GroupMembersPort,
} from '@contexts/balances/application/ports/group-members.port';
import { BalanceAccessDeniedException } from '@contexts/balances/domain/exceptions/balance-access-denied.exception';
import { Inject, Injectable } from '@nestjs/common';
import { StringValueObject, UuidValueObject } from '@sisques-labs/nestjs-kit';

/**
 * Not `IBaseService` — that interface is single-input, and this assertion
 * inherently needs two (groupId + requesterId).
 */
@Injectable()
export class AssertRequesterIsGroupMemberService {
  constructor(
    @Inject(GROUP_MEMBERS_PORT)
    private readonly membersPort: GroupMembersPort,
  ) {}

  async execute(
    groupId: UuidValueObject,
    requesterId: StringValueObject,
  ): Promise<void> {
    const isMember = await this.membersPort.isMember(
      groupId.value,
      requesterId.value,
    );
    if (!isMember) {
      throw new BalanceAccessDeniedException(requesterId.value, groupId.value);
    }
  }
}
