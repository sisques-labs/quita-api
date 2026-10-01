import { GroupFindByIdQuery } from '@contexts/groups/application/queries/group-find-by-id/group-find-by-id.query';
import { GroupsFindOwnQuery } from '@contexts/groups/application/queries/groups-find-own/groups-find-own.query';
import { GroupViewModel } from '@contexts/groups/domain/view-models/group.view-model';
import { GroupResponseDto } from '@contexts/groups/transport/graphql/dtos/responses/group.response.dto';
import { GroupGraphQLMapper } from '@contexts/groups/transport/graphql/mappers/group-graphql.mapper';
import { AuthUser } from '@core/auth/infrastructure/clerk/auth-user.decorator';
import { ClerkAuthGuard } from '@core/auth/infrastructure/clerk/clerk-auth.guard';
import { Logger, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';

@Resolver(() => GroupResponseDto)
@UseGuards(ClerkAuthGuard)
export class GroupQueriesResolver {
  private readonly logger = new Logger(GroupQueriesResolver.name);

  constructor(
    private readonly queryBus: QueryBus,
    private readonly mapper: GroupGraphQLMapper,
  ) {}

  @Query(() => GroupResponseDto, {
    name: 'group',
    description: 'A group by id; the caller must belong to it.',
  })
  async group(
    @Args('id', { type: () => ID }) id: string,
    @AuthUser() user: AuthUser,
  ): Promise<GroupResponseDto> {
    this.logger.log(`group id=${id} requester=${user.userId}`);

    const viewModel = await this.queryBus.execute<
      GroupFindByIdQuery,
      GroupViewModel
    >(new GroupFindByIdQuery({ groupId: id, requesterId: user.userId }));

    return this.mapper.toResponseDtoFromViewModel(viewModel);
  }

  @Query(() => [GroupResponseDto], {
    name: 'groups',
    description: 'The groups the caller belongs to.',
  })
  async groups(@AuthUser() user: AuthUser): Promise<GroupResponseDto[]> {
    this.logger.log(`groups requester=${user.userId}`);

    const viewModels = await this.queryBus.execute<
      GroupsFindOwnQuery,
      GroupViewModel[]
    >(new GroupsFindOwnQuery({ requesterId: user.userId }));

    return this.mapper.toResponseDtosFromViewModels(viewModels);
  }
}
