import { RegenerateInvitationCodeCommand } from '@contexts/group-invitation-codes/application/commands/regenerate-invitation-code/regenerate-invitation-code.command';
import {
  INVITATION_CODE_GENERATOR,
  InvitationCodeGeneratorPort,
} from '@contexts/group-invitation-codes/application/ports/invitation-code-generator.port';
import { withCodeCollisionRetry } from '@contexts/group-invitation-codes/application/helpers/with-code-collision-retry';
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

/**
 * Replaces the group's active code: the old one is revoked and the new one
 * inserted atomically through `replaceActive`; events go out only afterwards.
 */
@CommandHandler(RegenerateInvitationCodeCommand)
export class RegenerateInvitationCodeHandler
  extends BaseCommandHandler<
    RegenerateInvitationCodeCommand,
    GroupInvitationCodeAggregate
  >
  implements ICommandHandler<RegenerateInvitationCodeCommand, string>
{
  private readonly logger = new Logger(RegenerateInvitationCodeHandler.name);

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

  async execute(command: RegenerateInvitationCodeCommand): Promise<string> {
    await this.assertRequesterIsMember.execute(
      command.groupId.value,
      command.requesterId.value,
    );

    const previous = await this.repository.findActiveByGroupId(
      command.groupId.value,
    );
    previous?.revoke(new Date());

    const created = await withCodeCollisionRetry(async () => {
      const candidate = new GroupInvitationCodeBuilder()
        .withId(UuidValueObject.generate().value)
        .withGroupId(command.groupId.value)
        .withCode(this.generator.generate())
        .withCreatedBy(command.requesterId.value)
        .build();
      candidate.create();
      await this.repository.replaceActive(previous, candidate);
      return candidate;
    });
    if (previous) {
      await this.publishEvents(previous);
    }
    await this.publishEvents(created);

    this.logger.log(
      `Invitation code regenerated for group ${command.groupId.value}`,
    );
    return created.code.value;
  }
}
