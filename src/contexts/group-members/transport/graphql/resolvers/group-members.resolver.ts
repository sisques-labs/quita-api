import { GroupMembersListQuery } from '@contexts/group-members/application/queries/group-members-list/group-members-list.query';
import { GroupMembershipViewModel } from '@contexts/group-members/domain/view-models/group-membership.view-model';
import { GroupMemberGraphQLMapper } from '@contexts/group-members/transport/graphql/mappers/group-member-graphql.mapper';
import { GroupMemberObject } from '@contexts/group-members/transport/graphql/objects/group-member.object';
import { AuthUser } from '@core/auth/infrastructure/clerk/auth-user.decorator';
import { ClerkAuthGuard } from '@core/auth/infrastructure/clerk/clerk-auth.guard';
import { Logger, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';

@Resolver(() => GroupMemberObject)
@UseGuards(ClerkAuthGuard)
export class GroupMembersResolver {
  private readonly logger = new Logger(GroupMembersResolver.name);

  constructor(
    private readonly queryBus: QueryBus,
    private readonly mapper: GroupMemberGraphQLMapper,
  ) {}

  @Query(() => [GroupMemberObject], {
    name: 'groupMembers',
    description: 'Members of a group; the caller must belong to it.',
  })
  async groupMembers(
    @Args('groupId', { type: () => ID }) groupId: string,
    @AuthUser() user: AuthUser,
  ): Promise<GroupMemberObject[]> {
    this.logger.log(`groupMembers group=${groupId} requester=${user.userId}`);

    const viewModel = await this.queryBus.execute<
      GroupMembersListQuery,
      GroupMembershipViewModel
    >(new GroupMembersListQuery({ groupId, requesterId: user.userId }));

    return this.mapper.toObjects(viewModel);
  }
}
