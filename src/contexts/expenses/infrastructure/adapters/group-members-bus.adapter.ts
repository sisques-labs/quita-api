import { GroupMembersPort } from '@contexts/expenses/application/ports/group-members.port';
import { GroupMemberIsMemberQuery } from '@contexts/group-members/application/queries/group-member-is-member/group-member-is-member.query';
import { GroupMembersFindByGroupIdQuery } from '@contexts/group-members/application/queries/group-members-find-by-group-id/group-members-find-by-group-id.query';
import { GroupMembershipViewModel } from '@contexts/group-members/domain/view-models/group-membership.view-model';
import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

/**
 * Anti-corruption seam towards group-members: translates the expenses-owned
 * port into that context's public queries on the bus. It never touches its
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

  async listMemberIds(groupId: string): Promise<string[]> {
    const roster = await this.queryBus.execute<
      GroupMembersFindByGroupIdQuery,
      GroupMembershipViewModel
    >(new GroupMembersFindByGroupIdQuery({ groupId }));
    return roster.members.map((member) => member.userId);
  }
}
