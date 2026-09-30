import { CreateGroupMembershipCommand } from '@contexts/group-members/application/commands/create-group-membership/create-group-membership.command';
import { GroupMemberIsMemberQuery } from '@contexts/group-members/application/queries/group-member-is-member/group-member-is-member.query';
import { GroupMembershipFindGroupIdsByUserQuery } from '@contexts/group-members/application/queries/group-membership-find-group-ids-by-user/group-membership-find-group-ids-by-user.query';
import { GroupMembershipPort } from '@contexts/groups/application/ports/group-membership.port';
import { Injectable } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';

/**
 * Anti-corruption seam towards group-members: translates the groups-owned
 * port into that context's public commands and queries on the bus. It never
 * touches its repositories or entities.
 */
@Injectable()
export class GroupMembershipBusAdapter implements GroupMembershipPort {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  async createMembership(groupId: string, ownerId: string): Promise<void> {
    await this.commandBus.execute(
      new CreateGroupMembershipCommand({ groupId, ownerId }),
    );
  }

  isMember(groupId: string, userId: string): Promise<boolean> {
    return this.queryBus.execute(
      new GroupMemberIsMemberQuery({ groupId, userId }),
    );
  }

  listGroupIdsForUser(userId: string): Promise<string[]> {
    return this.queryBus.execute(
      new GroupMembershipFindGroupIdsByUserQuery({ userId }),
    );
  }
}
