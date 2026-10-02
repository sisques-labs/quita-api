import { CreateGroupMembershipCommand } from '@contexts/group-members/application/commands/create-group-membership/create-group-membership.command';
import { AssertGroupMembershipNotExistsService } from '@contexts/group-members/application/services/write/assert-group-membership-not-exists/assert-group-membership-not-exists.service';
import { GroupMembershipBuilder } from '@contexts/group-members/domain/builders/group-membership.builder';
import { GroupMemberRole } from '@contexts/group-members/domain/enums/group-member-role.enum';
import {
  GROUP_MEMBERSHIP_WRITE_REPOSITORY,
  IGroupMembershipWriteRepository,
} from '@contexts/group-members/domain/repositories/write/group-membership-write.repository';
import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { BaseCommandHandler } from '@sisques-labs/nestjs-kit';
import { GroupMembershipAggregate } from '@contexts/group-members/domain/aggregates/group-membership.aggregate';

@CommandHandler(CreateGroupMembershipCommand)
export class CreateGroupMembershipHandler
  extends BaseCommandHandler<
    CreateGroupMembershipCommand,
    GroupMembershipAggregate
  >
  implements ICommandHandler<CreateGroupMembershipCommand>
{
  private readonly logger = new Logger(CreateGroupMembershipHandler.name);

  constructor(
    @Inject(GROUP_MEMBERSHIP_WRITE_REPOSITORY)
    private readonly repository: IGroupMembershipWriteRepository,
    private readonly assertNotExists: AssertGroupMembershipNotExistsService,
    eventBus: EventBus,
  ) {
    super(eventBus);
  }

  async execute(command: CreateGroupMembershipCommand): Promise<void> {
    await this.assertNotExists.execute(command.groupId);

    const now = new Date();

    const aggregate = new GroupMembershipBuilder()
      .withId(command.groupId.value)
      .withMembers([
        {
          userId: command.ownerId.value,
          role: GroupMemberRole.OWNER,
          joinedAt: now,
        },
      ])
      .build();
    aggregate.create();

    await this.repository.save(aggregate);
    await this.publishEvents(aggregate);

    this.logger.log(
      `Membership created for group ${command.groupId.value} with owner ${command.ownerId.value}`,
    );
  }
}
