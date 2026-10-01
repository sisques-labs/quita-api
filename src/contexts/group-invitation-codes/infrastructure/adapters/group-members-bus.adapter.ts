import { AddGroupMemberCommand } from '@contexts/group-members/application/commands/add-group-member/add-group-member.command';
import { GroupMemberIsMemberQuery } from '@contexts/group-members/application/queries/group-member-is-member/group-member-is-member.query';
import { GroupMemberAlreadyExistsException } from '@contexts/group-members/domain/exceptions/group-member-already-exists.exception';
import {
  AddMemberResult,
  GroupMembersPort,
} from '@contexts/group-invitation-codes/application/ports/group-members.port';
import { Injectable } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';

/**
 * Anti-corruption seam towards group-members: translates the codes-owned port
 * into that context's public commands and queries on the bus, and turns its
 * "already a member" error into a result. Other errors (a full group) propagate.
 */
@Injectable()
export class GroupMembersBusAdapter implements GroupMembersPort {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  isMember(groupId: string, userId: string): Promise<boolean> {
    return this.queryBus.execute(
      new GroupMemberIsMemberQuery({ groupId, userId }),
    );
  }

  async addMember(groupId: string, userId: string): Promise<AddMemberResult> {
    try {
      await this.commandBus.execute(
        new AddGroupMemberCommand({ groupId, userId }),
      );
      return AddMemberResult.ADDED;
    } catch (error) {
      if (error instanceof GroupMemberAlreadyExistsException) {
        return AddMemberResult.ALREADY_MEMBER;
      }
      throw error;
    }
  }
}
