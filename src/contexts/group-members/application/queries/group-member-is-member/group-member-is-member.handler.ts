import { GroupMemberIsMemberQuery } from '@contexts/group-members/application/queries/group-member-is-member/group-member-is-member.query';
import {
  GROUP_MEMBERSHIP_READ_REPOSITORY,
  IGroupMembershipReadRepository,
} from '@contexts/group-members/domain/repositories/read/group-membership-read.repository';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

@QueryHandler(GroupMemberIsMemberQuery)
export class GroupMemberIsMemberHandler implements IQueryHandler<
  GroupMemberIsMemberQuery,
  boolean
> {
  private readonly logger = new Logger(GroupMemberIsMemberHandler.name);

  constructor(
    @Inject(GROUP_MEMBERSHIP_READ_REPOSITORY)
    private readonly repository: IGroupMembershipReadRepository,
  ) {}

  async execute(query: GroupMemberIsMemberQuery): Promise<boolean> {
    this.logger.log(
      `Checking membership of ${query.userId.value} in group ${query.groupId.value}`,
    );
    return this.repository.isMember(query.groupId.value, query.userId.value);
  }
}
