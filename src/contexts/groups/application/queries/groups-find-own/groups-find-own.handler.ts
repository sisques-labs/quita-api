import {
  GROUP_MEMBERSHIP_PORT,
  GroupMembershipPort,
} from '@contexts/groups/application/ports/group-membership.port';
import { GroupsFindOwnQuery } from '@contexts/groups/application/queries/groups-find-own/groups-find-own.query';
import {
  GROUP_READ_REPOSITORY,
  GroupReadRepository,
} from '@contexts/groups/domain/repositories/read/group-read.repository';
import { GroupViewModel } from '@contexts/groups/domain/view-models/group.view-model';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

/** Lists only the groups the requester belongs to (per the membership port). */
@QueryHandler(GroupsFindOwnQuery)
export class GroupsFindOwnHandler implements IQueryHandler<
  GroupsFindOwnQuery,
  GroupViewModel[]
> {
  private readonly logger = new Logger(GroupsFindOwnHandler.name);

  constructor(
    @Inject(GROUP_MEMBERSHIP_PORT)
    private readonly membershipPort: GroupMembershipPort,
    @Inject(GROUP_READ_REPOSITORY)
    private readonly repository: GroupReadRepository,
  ) {}

  async execute(query: GroupsFindOwnQuery): Promise<GroupViewModel[]> {
    this.logger.log(`Listing groups of ${query.requesterId.value}`);
    const groupIds = await this.membershipPort.listGroupIdsForUser(
      query.requesterId.value,
    );
    if (groupIds.length === 0) {
      return [];
    }
    return this.repository.findByIds(groupIds);
  }
}
