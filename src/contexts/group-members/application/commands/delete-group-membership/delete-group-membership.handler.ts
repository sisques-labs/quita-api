import { DeleteGroupMembershipCommand } from '@contexts/group-members/application/commands/delete-group-membership/delete-group-membership.command';
import {
  GROUP_MEMBERSHIP_WRITE_REPOSITORY,
  GroupMembershipWriteRepository,
} from '@contexts/group-members/domain/repositories/write/group-membership-write.repository';
import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

/**
 * Removes a group's roster (membership and member rows). Idempotent: it is
 * also used as compensation, which may run before a roster was ever created,
 * so a missing roster is not an error.
 */
@CommandHandler(DeleteGroupMembershipCommand)
export class DeleteGroupMembershipHandler implements ICommandHandler<
  DeleteGroupMembershipCommand,
  void
> {
  private readonly logger = new Logger(DeleteGroupMembershipHandler.name);

  constructor(
    @Inject(GROUP_MEMBERSHIP_WRITE_REPOSITORY)
    private readonly repository: GroupMembershipWriteRepository,
  ) {}

  async execute(command: DeleteGroupMembershipCommand): Promise<void> {
    await this.repository.delete(command.groupId.value);

    this.logger.log(`Membership of group ${command.groupId.value} deleted`);
  }
}
