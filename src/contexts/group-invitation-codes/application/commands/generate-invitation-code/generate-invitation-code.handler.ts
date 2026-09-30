import { GenerateInvitationCodeCommand } from '@contexts/group-invitation-codes/application/commands/generate-invitation-code/generate-invitation-code.command';
import {
  INVITATION_CODE_GENERATOR,
  InvitationCodeGeneratorPort,
} from '@contexts/group-invitation-codes/application/ports/invitation-code-generator.port';
import { AssertRequesterIsGroupMemberService } from '@contexts/group-invitation-codes/application/services/read/assert-requester-is-group-member.service';
import { GroupInvitationCodeAggregate } from '@contexts/group-invitation-codes/domain/aggregates/group-invitation-code.aggregate';
import { GroupInvitationCodeBuilder } from '@contexts/group-invitation-codes/domain/builders/group-invitation-code.builder';
import {
  GROUP_INVITATION_CODE_WRITE_REPOSITORY,
  GroupInvitationCodeWriteRepository,
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
    private readonly repository: GroupInvitationCodeWriteRepository,
    @Inject(INVITATION_CODE_GENERATOR)
    private readonly generator: InvitationCodeGeneratorPort,
    private readonly assertRequesterIsMember: AssertRequesterIsGroupMemberService,
    eventBus: EventBus,
  ) {
    super(eventBus);
  }

  async execute(command: GenerateInvitationCodeCommand): Promise<string> {
    await this.assertRequesterIsMember.execute(
      command.groupId.value,
      command.requesterId.value,
    );

    const active = await this.repository.findActiveByGroupId(
      command.groupId.value,
    );
    if (active) {
      return active.code.value;
    }

    const created = new GroupInvitationCodeBuilder()
      .withId(UuidValueObject.generate().value)
      .withGroupId(command.groupId.value)
      .withCode(this.generator.generate())
      .withCreatedBy(command.requesterId.value)
      .build();
    created.create();

    await this.repository.save(created);
    await this.publishEvents(created);

    this.logger.log(
      `Invitation code created for group ${command.groupId.value}`,
    );
    return created.code.value;
  }
}
