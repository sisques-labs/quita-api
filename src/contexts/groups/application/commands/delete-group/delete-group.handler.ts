import { DeleteGroupCommand } from '@contexts/groups/application/commands/delete-group/delete-group.command';
import {
  GROUP_MEMBERSHIP_PORT,
  GroupMembershipPort,
} from '@contexts/groups/application/ports/group-membership.port';
import { AssertGroupExistsService } from '@contexts/groups/application/services/write/assert-group-exists.service';
import { GroupAggregate } from '@contexts/groups/domain/aggregates/group.aggregate';
import {
  GROUP_WRITE_REPOSITORY,
  GroupWriteRepository,
} from '@contexts/groups/domain/repositories/write/group-write.repository';
import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { BaseCommandHandler } from '@sisques-labs/nestjs-kit';

/**
 * Deletes the group and its associated memberships.
 */
@CommandHandler(DeleteGroupCommand)
export class DeleteGroupHandler
  extends BaseCommandHandler<DeleteGroupCommand, GroupAggregate>
  implements ICommandHandler<DeleteGroupCommand, string>
{
  private readonly logger = new Logger(DeleteGroupHandler.name);

  constructor(
    @Inject(GROUP_WRITE_REPOSITORY)
    private readonly repository: GroupWriteRepository,
    private readonly assertGroupExistsService: AssertGroupExistsService,
    @Inject(GROUP_MEMBERSHIP_PORT)
    private readonly membershipPort: GroupMembershipPort,
    eventBus: EventBus,
  ) {
    super(eventBus);
  }

  async execute(command: DeleteGroupCommand): Promise<string> {
    const group = await this.assertGroupExistsService.execute(
      command.groupId.value,
    );

    await this.repository.delete(group.id.value);

    group.delete();

    try {
      await this.membershipPort.deleteMemberships(group.id.value);
    } catch (error) {
      this.logger.error(
        `Could not delete memberships for group ${group.id.value}`,
        error instanceof Error ? error.stack : undefined,
      );
    }

    await this.publishEvents(group);

    this.logger.log(`Group ${group.id.value} deleted`);

    return group.id.value;
  }
}
