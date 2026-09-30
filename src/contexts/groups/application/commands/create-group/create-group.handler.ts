import { CreateGroupCommand } from '@contexts/groups/application/commands/create-group/create-group.command';
import { DeleteGroupCommand } from '@contexts/groups/application/commands/delete-group/delete-group.command';
import {
  GROUP_MEMBERSHIP_PORT,
  GroupMembershipPort,
} from '@contexts/groups/application/ports/group-membership.port';
import { GroupAggregate } from '@contexts/groups/domain/aggregates/group.aggregate';
import { GroupBuilder } from '@contexts/groups/domain/builders/group.builder';
import {
  GROUP_WRITE_REPOSITORY,
  GroupWriteRepository,
} from '@contexts/groups/domain/repositories/write/group-write.repository';
import { Inject, Logger } from '@nestjs/common';
import {
  CommandBus,
  CommandHandler,
  EventBus,
  ICommandHandler,
} from '@nestjs/cqrs';
import { BaseCommandHandler, UuidValueObject } from '@sisques-labs/nestjs-kit';

/**
 * Creates the group, then makes its creator the first member through the
 * membership port. If the port fails the group is deleted (compensation) and
 * the failure is rethrown, so no group is left without an owner.
 */
@CommandHandler(CreateGroupCommand)
export class CreateGroupHandler
  extends BaseCommandHandler<CreateGroupCommand, GroupAggregate>
  implements ICommandHandler<CreateGroupCommand, string>
{
  private readonly logger = new Logger(CreateGroupHandler.name);

  constructor(
    @Inject(GROUP_WRITE_REPOSITORY)
    private readonly repository: GroupWriteRepository,
    @Inject(GROUP_MEMBERSHIP_PORT)
    private readonly membershipPort: GroupMembershipPort,
    private readonly commandBus: CommandBus,
    eventBus: EventBus,
  ) {
    super(eventBus);
  }

  async execute(command: CreateGroupCommand): Promise<string> {
    const group = new GroupBuilder()
      .withId(UuidValueObject.generate().value)
      .withName(command.name.value)
      .withCreatedBy(command.ownerId.value)
      .build();
    group.create();

    await this.repository.save(group);

    try {
      await this.membershipPort.createMembership(
        group.id.value,
        command.ownerId.value,
      );
    } catch (error) {
      await this.compensate(group.id.value);
      throw error;
    }

    await this.publishEvents(group);

    this.logger.log(
      `Group ${group.id.value} created by ${command.ownerId.value}`,
    );
    return group.id.value;
  }

  private async compensate(groupId: string): Promise<void> {
    try {
      this.commandBus.execute(new DeleteGroupCommand({ groupId }));
    } catch (error) {
      this.logger.error(
        `Could not delete group ${groupId} after a failed membership creation`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
