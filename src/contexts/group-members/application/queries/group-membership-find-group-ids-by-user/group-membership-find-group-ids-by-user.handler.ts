import { GroupMembershipFindGroupIdsByUserQuery } from '@contexts/group-members/application/queries/group-membership-find-group-ids-by-user/group-membership-find-group-ids-by-user.query';
import {
  GROUP_MEMBERSHIP_READ_REPOSITORY,
  IGroupMembershipReadRepository,
} from '@contexts/group-members/domain/repositories/read/group-membership-read.repository';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

@QueryHandler(GroupMembershipFindGroupIdsByUserQuery)
export class GroupMembershipFindGroupIdsByUserHandler implements IQueryHandler<
  GroupMembershipFindGroupIdsByUserQuery,
  string[]
> {
  private readonly logger = new Logger(
    GroupMembershipFindGroupIdsByUserHandler.name,
  );

  constructor(
    @Inject(GROUP_MEMBERSHIP_READ_REPOSITORY)
    private readonly repository: IGroupMembershipReadRepository,
  ) {}

  async execute(
    query: GroupMembershipFindGroupIdsByUserQuery,
  ): Promise<string[]> {
    this.logger.log(`Finding group ids of user ${query.userId.value}`);
    return this.repository.findGroupIdsByUserId(query.userId.value);
  }
}
