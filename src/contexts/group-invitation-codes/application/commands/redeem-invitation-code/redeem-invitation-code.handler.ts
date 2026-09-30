import { RedeemInvitationCodeCommand } from '@contexts/group-invitation-codes/application/commands/redeem-invitation-code/redeem-invitation-code.command';
import {
  GROUP_MEMBERS_PORT,
  GroupMembersPort,
} from '@contexts/group-invitation-codes/application/ports/group-members.port';
import { AssertActiveInvitationCodeExistsService } from '@contexts/group-invitation-codes/application/services/read/assert-active-invitation-code-exists.service';
import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

/**
 * Joins the requester to the group behind an active code. The code stays
 * valid afterwards (reusable); a user who already belongs to the group is
 * treated as a success so the operation is idempotent.
 */
@CommandHandler(RedeemInvitationCodeCommand)
export class RedeemInvitationCodeHandler implements ICommandHandler<
  RedeemInvitationCodeCommand,
  string
> {
  private readonly logger = new Logger(RedeemInvitationCodeHandler.name);

  constructor(
    private readonly assertCodeExists: AssertActiveInvitationCodeExistsService,
    @Inject(GROUP_MEMBERS_PORT)
    private readonly membersPort: GroupMembersPort,
  ) {}

  async execute(command: RedeemInvitationCodeCommand): Promise<string> {
    const { groupId } = await this.assertCodeExists.execute(command.code.value);

    const result = await this.membersPort.addMember(
      groupId,
      command.requesterId.value,
    );

    this.logger.log(
      `User ${command.requesterId.value} redeemed a code for group ${groupId} (${result})`,
    );
    return groupId;
  }
}
