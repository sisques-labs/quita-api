import { GroupMembersFindByGroupIdQuery } from '@contexts/group-members/application/queries/group-members-find-by-group-id/group-members-find-by-group-id.query';
import { AssertGroupMembershipViewModelExistsService } from '@contexts/group-members/application/services/read/assert-group-membership-view-model-exists.service';
import { GroupMembershipViewModel } from '@contexts/group-members/domain/view-models/group-membership.view-model';
import { Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

/** Trusted lookup for other contexts' ports; callers check membership themselves. */
@QueryHandler(GroupMembersFindByGroupIdQuery)
export class GroupMembersFindByGroupIdHandler implements IQueryHandler<
  GroupMembersFindByGroupIdQuery,
  GroupMembershipViewModel
> {
  private readonly logger = new Logger(GroupMembersFindByGroupIdHandler.name);

  constructor(
    private readonly assertExists: AssertGroupMembershipViewModelExistsService,
  ) {}

  async execute(
    query: GroupMembersFindByGroupIdQuery,
  ): Promise<GroupMembershipViewModel> {
    this.logger.log(`Finding members of group ${query.groupId.value}`);
    return this.assertExists.execute(query.groupId.value);
  }
}
