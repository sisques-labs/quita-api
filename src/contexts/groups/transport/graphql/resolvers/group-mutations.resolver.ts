import { CreateGroupCommand } from '@contexts/groups/application/commands/create-group/create-group.command';
import { GroupCreateRequestDto } from '@contexts/groups/transport/graphql/dtos/requests/group-create.request.dto';
import { AuthUser } from '@core/auth/infrastructure/clerk/auth-user.decorator';
import { ClerkAuthGuard } from '@core/auth/infrastructure/clerk/clerk-auth.guard';
import { Logger, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import {
  MutationResponseDto,
  MutationResponseGraphQLMapper,
} from '@sisques-labs/nestjs-kit/graphql';

@Resolver()
@UseGuards(ClerkAuthGuard)
export class GroupMutationsResolver {
  private readonly logger = new Logger(GroupMutationsResolver.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly mutationResponseMapper: MutationResponseGraphQLMapper,
  ) {}

  @Mutation(() => MutationResponseDto, {
    name: 'createGroup',
    description: 'Creates a group; the caller becomes its first member.',
  })
  async createGroup(
    @Args('input') input: GroupCreateRequestDto,
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
}
