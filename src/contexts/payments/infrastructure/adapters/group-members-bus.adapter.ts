import { GroupMemberIsMemberQuery } from '@contexts/group-members/application/queries/group-member-is-member/group-member-is-member.query';
import { GroupMembersPort } from '@contexts/payments/application/ports/group-members.port';
import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

/**
 * Anti-corruption seam towards group-members: translates the payments-owned
 * port into that context's public query on the bus. It never touches its
 * repositories or entities.
 */
@Injectable()
export class GroupMembersBusAdapter implements GroupMembersPort {
  constructor(private readonly queryBus: QueryBus) {}

  isMember(groupId: string, userId: string): Promise<boolean> {
    return this.queryBus.execute(
      new GroupMemberIsMemberQuery({ groupId, userId }),
    );
  }
}
