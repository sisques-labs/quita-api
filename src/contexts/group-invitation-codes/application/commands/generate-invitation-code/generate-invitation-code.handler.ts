import { GenerateInvitationCodeCommand } from '@contexts/group-invitation-codes/application/commands/generate-invitation-code/generate-invitation-code.command';
import {
  INVITATION_CODE_GENERATOR,
  InvitationCodeGeneratorPort,
} from '@contexts/group-invitation-codes/application/ports/invitation-code-generator.port';
import { withCodeCollisionRetry } from '@contexts/group-invitation-codes/application/helpers/with-code-collision-retry';
import { AssertRequesterIsGroupMemberService } from '@contexts/group-invitation-codes/application/services/read/assert-requester-is-group-member/assert-requester-is-group-member.service';
import { GroupInvitationCodeAggregate } from '@contexts/group-invitation-codes/domain/aggregates/group-invitation-code.aggregate';
import { GroupInvitationCodeBuilder } from '@contexts/group-invitation-codes/domain/builders/group-invitation-code.builder';
import { ActiveInvitationCodeConflictException } from '@contexts/group-invitation-codes/domain/exceptions/active-invitation-code-conflict.exception';
import {
  GROUP_INVITATION_CODE_WRITE_REPOSITORY,
  IGroupInvitationCodeWriteRepository,
} from '@contexts/group-invitation-codes/domain/repositories/write/group-invitation-code-write.repository';
import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { BaseCommandHandler, UuidValueObject } from '@sisques-labs/nestjs-kit';

/** Returns the group's active code, creating one only when it has none. */
@CommandHandler(GenerateInvitationCodeCommand)
export class GenerateInvitationCodeHandler
  extends BaseCommandHandler<
    GenerateInvitationCodeCommand,
    GroupInvitationCodeAggregate
  >
  implements ICommandHandler<GenerateInvitationCodeCommand, string>
{
  private readonly logger = new Logger(GenerateInvitationCodeHandler.name);

  constructor(
    @Inject(GROUP_INVITATION_CODE_WRITE_REPOSITORY)
    private readonly repository: IGroupInvitationCodeWriteRepository,
    @Inject(INVITATION_CODE_GENERATOR)
    private readonly generator: InvitationCodeGeneratorPort,
    private readonly assertRequesterIsMember: AssertRequesterIsGroupMemberService,
    private readonly groupInvitationCodeBuilder: GroupInvitationCodeBuilder,
    eventBus: EventBus,
  ) {
    super(eventBus);
  }

  async execute(command: GenerateInvitationCodeCommand): Promise<string> {
    await this.assertRequesterIsMember.execute(
      command.groupId,
      command.requesterId,
    );

    const active = await this.repository.findActiveByGroupId(
      command.groupId.value,
    );
    if (active) {
      return active.code.value;
    }

    try {
      const created = await withCodeCollisionRetry(() =>
        this.createAndSave(command),
      );
      await this.publishEvents(created);
      this.logger.log(
        `Invitation code created for group ${command.groupId.value}`,
      );
      return created.code.value;
    } catch (error) {
      if (!(error instanceof ActiveInvitationCodeConflictException)) {
        throw error;
      }
      // A concurrent request created the group's code first: share it.
      const winner = await this.repository.findActiveByGroupId(
        command.groupId.value,
      );
      if (!winner) {
        throw error;
      }
      return winner.code.value;
    }
  }

  private async createAndSave(
    command: GenerateInvitationCodeCommand,
  ): Promise<GroupInvitationCodeAggregate> {
    const created = this.groupInvitationCodeBuilder
      .withId(UuidValueObject.generate().value)
      .withGroupId(command.groupId.value)
      .withCode(this.generator.generate())
      .withCreatedBy(command.requesterId.value)
      .build();
    created.create();

    await this.repository.save(created);
    return created;
  }
}
