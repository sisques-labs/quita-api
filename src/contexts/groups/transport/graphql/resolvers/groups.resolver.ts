import { CreateGroupCommand } from '@contexts/groups/application/commands/create-group/create-group.command';
import { GroupFindByIdQuery } from '@contexts/groups/application/queries/group-find-by-id/group-find-by-id.query';
import { GroupsFindOwnQuery } from '@contexts/groups/application/queries/groups-find-own/groups-find-own.query';
import { GroupViewModel } from '@contexts/groups/domain/view-models/group.view-model';
import { CreateGroupInput } from '@contexts/groups/transport/graphql/dtos/create-group.input';
import { GroupGraphQLMapper } from '@contexts/groups/transport/graphql/mappers/group-graphql.mapper';
import { GroupObject } from '@contexts/groups/transport/graphql/objects/group.object';
import { AuthUser } from '@core/auth/infrastructure/clerk/auth-user.decorator';
import { ClerkAuthGuard } from '@core/auth/infrastructure/clerk/clerk-auth.guard';
import { Logger, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
  MutationResponseDto,
  MutationResponseGraphQLMapper,
} from '@sisques-labs/nestjs-kit/graphql';

@Resolver(() => GroupObject)
@UseGuards(ClerkAuthGuard)
export class GroupsResolver {
  private readonly logger = new Logger(GroupsResolver.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly mapper: GroupGraphQLMapper,
    private readonly mutationResponseMapper: MutationResponseGraphQLMapper,
  ) {}

  @Mutation(() => MutationResponseDto, {
    name: 'createGroup',
    description: 'Creates a group; the caller becomes its first member.',
  })
  async createGroup(
    @Args('input') input: CreateGroupInput,
    @AuthUser() user: AuthUser,
  ): Promise<MutationResponseDto> {
    this.logger.log(`createGroup requester=${user.userId}`);

    const id = await this.commandBus.execute<CreateGroupCommand, string>(
      new CreateGroupCommand({ name: input.name, ownerId: user.userId }),
    );

    return this.mutationResponseMapper.toResponseDto({
      success: true,
      message: 'Group created successfully',
      id,
    });
  }

  @Query(() => GroupObject, {
    name: 'group',
    description: 'A group by id; the caller must belong to it.',
  })
  async group(
    @Args('id', { type: () => ID }) id: string,
    @AuthUser() user: AuthUser,
  ): Promise<GroupObject> {
    this.logger.log(`group id=${id} requester=${user.userId}`);

    const viewModel = await this.queryBus.execute<
      GroupFindByIdQuery,
      GroupViewModel
    >(new GroupFindByIdQuery({ groupId: id, requesterId: user.userId }));

    return this.mapper.toObject(viewModel);
  }

  @Query(() => [GroupObject], {
    name: 'groups',
    description: 'The groups the caller belongs to.',
  })
  async groups(@AuthUser() user: AuthUser): Promise<GroupObject[]> {
    this.logger.log(`groups requester=${user.userId}`);

    const viewModels = await this.queryBus.execute<
      GroupsFindOwnQuery,
      GroupViewModel[]
    >(new GroupsFindOwnQuery({ requesterId: user.userId }));

    return this.mapper.toObjects(viewModels);
  }
}
