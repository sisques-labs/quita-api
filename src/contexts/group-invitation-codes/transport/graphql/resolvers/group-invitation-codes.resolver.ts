import { GenerateInvitationCodeCommand } from '@contexts/group-invitation-codes/application/commands/generate-invitation-code/generate-invitation-code.command';
import { RedeemInvitationCodeCommand } from '@contexts/group-invitation-codes/application/commands/redeem-invitation-code/redeem-invitation-code.command';
import { RegenerateInvitationCodeCommand } from '@contexts/group-invitation-codes/application/commands/regenerate-invitation-code/regenerate-invitation-code.command';
import {
  GenerateInvitationCodeInput,
  RedeemInvitationCodeInput,
  RegenerateInvitationCodeInput,
} from '@contexts/group-invitation-codes/transport/graphql/dtos/group-invitation-code.inputs';
import { GroupInvitationCodeObject } from '@contexts/group-invitation-codes/transport/graphql/objects/group-invitation-code.object';
import { AuthUser } from '@core/auth/infrastructure/clerk/auth-user.decorator';
import { ClerkAuthGuard } from '@core/auth/infrastructure/clerk/clerk-auth.guard';
import { Logger, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import {
  MutationResponseDto,
  MutationResponseGraphQLMapper,
} from '@sisques-labs/nestjs-kit/graphql';

@Resolver(() => GroupInvitationCodeObject)
@UseGuards(ClerkAuthGuard)
export class GroupInvitationCodesResolver {
  private readonly logger = new Logger(GroupInvitationCodesResolver.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly mutationResponseMapper: MutationResponseGraphQLMapper,
  ) {}

  @Mutation(() => GroupInvitationCodeObject, {
    name: 'generateInvitationCode',
    description:
      "The group's active code, created when it has none. Members only.",
  })
  async generateInvitationCode(
    @Args('input') input: GenerateInvitationCodeInput,
    @AuthUser() user: AuthUser,
  ): Promise<GroupInvitationCodeObject> {
    this.logger.log(
      `generateInvitationCode group=${input.groupId} requester=${user.userId}`,
    );

    const code = await this.commandBus.execute<
      GenerateInvitationCodeCommand,
      string
    >(
      new GenerateInvitationCodeCommand({
        groupId: input.groupId,
        requesterId: user.userId,
      }),
    );

    return { groupId: input.groupId, code };
  }

  @Mutation(() => GroupInvitationCodeObject, {
    name: 'regenerateInvitationCode',
    description:
      'Replaces the active code; the previous one stops working. Members only.',
  })
  async regenerateInvitationCode(
    @Args('input') input: RegenerateInvitationCodeInput,
    @AuthUser() user: AuthUser,
  ): Promise<GroupInvitationCodeObject> {
    this.logger.log(
      `regenerateInvitationCode group=${input.groupId} requester=${user.userId}`,
    );

    const code = await this.commandBus.execute<
      RegenerateInvitationCodeCommand,
      string
    >(
      new RegenerateInvitationCodeCommand({
        groupId: input.groupId,
        requesterId: user.userId,
      }),
    );

    return { groupId: input.groupId, code };
  }

  @Mutation(() => MutationResponseDto, {
    name: 'redeemInvitationCode',
    description: 'Joins the caller to the group behind an active code.',
  })
  async redeemInvitationCode(
    @Args('input') input: RedeemInvitationCodeInput,
    @AuthUser() user: AuthUser,
  ): Promise<MutationResponseDto> {
    this.logger.log(`redeemInvitationCode requester=${user.userId}`);

    const groupId = await this.commandBus.execute<
      RedeemInvitationCodeCommand,
      string
    >(
      new RedeemInvitationCodeCommand({
        code: input.code,
        requesterId: user.userId,
      }),
    );

    return this.mutationResponseMapper.toResponseDto({
      success: true,
      message: 'Joined the group successfully',
      id: groupId,
    });
  }
}
