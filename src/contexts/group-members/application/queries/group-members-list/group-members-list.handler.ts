import { GroupMembersListQuery } from '@contexts/group-members/application/queries/group-members-list/group-members-list.query';
import { AssertGroupMembershipViewModelExistsService } from '@contexts/group-members/application/services/read/assert-group-membership-view-model-exists/assert-group-membership-view-model-exists.service';
import { GroupMemberAccessDeniedException } from '@contexts/group-members/domain/exceptions/group-member-access-denied.exception';
import { GroupMembershipViewModel } from '@contexts/group-members/domain/view-models/group-membership.view-model';
import { Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

/** Member-facing listing: the requester must belong to the group. */
@QueryHandler(GroupMembersListQuery)
export class GroupMembersListHandler implements IQueryHandler<
  GroupMembersListQuery,
  GroupMembershipViewModel
> {
  private readonly logger = new Logger(GroupMembersListHandler.name);

  constructor(
    private readonly assertExists: AssertGroupMembershipViewModelExistsService,
  ) {}

  async execute(
    query: GroupMembersListQuery,
  ): Promise<GroupMembershipViewModel> {
    this.logger.log(
      `User ${query.requesterId.value} lists members of group ${query.groupId.value}`,
    );
    const viewModel = await this.assertExists.execute(query.groupId);

    const isMember = viewModel.members.some(
      (member) => member.userId === query.requesterId.value,
    );
    if (!isMember) {
      throw new GroupMemberAccessDeniedException(
        query.requesterId.value,
        query.groupId.value,
      );
    }
    return viewModel;
  }
}
