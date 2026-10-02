import { GroupFindByIdQuery } from '@contexts/groups/application/queries/group-find-by-id/group-find-by-id.query';
import { AssertGroupViewModelExistsService } from '@contexts/groups/application/services/read/assert-group-view-model-exists/assert-group-view-model-exists.service';
import { AssertRequesterIsGroupMemberService } from '@contexts/groups/application/services/read/assert-requester-is-group-member/assert-requester-is-group-member.service';
import { GroupViewModel } from '@contexts/groups/domain/view-models/group.view-model';
import { Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

/** Membership is checked first so non-members cannot probe group existence. */
@QueryHandler(GroupFindByIdQuery)
export class GroupFindByIdHandler implements IQueryHandler<
  GroupFindByIdQuery,
  GroupViewModel
> {
  private readonly logger = new Logger(GroupFindByIdHandler.name);

  constructor(
    private readonly assertRequesterIsMember: AssertRequesterIsGroupMemberService,
    private readonly assertGroupExists: AssertGroupViewModelExistsService,
  ) {}

  async execute(query: GroupFindByIdQuery): Promise<GroupViewModel> {
    this.logger.log(
      `Reading group ${query.groupId.value} for ${query.requesterId.value}`,
    );
    await this.assertRequesterIsMember.execute(
      query.groupId,
      query.requesterId,
    );
    return this.assertGroupExists.execute(query.groupId);
  }
}
