import { AddGroupMemberCommand } from '@contexts/group-members/application/commands/add-group-member/add-group-member.command';
import { AssertGroupMembershipExistsService } from '@contexts/group-members/application/services/write/assert-group-membership-exists/assert-group-membership-exists.service';
import { GroupMembershipAggregate } from '@contexts/group-members/domain/aggregates/group-membership.aggregate';
import { GroupMember } from '@contexts/group-members/domain/entities/group-member';
import { GroupMemberRole } from '@contexts/group-members/domain/enums/group-member-role.enum';
import {
  GROUP_MEMBERSHIP_WRITE_REPOSITORY,
  IGroupMembershipWriteRepository,
} from '@contexts/group-members/domain/repositories/write/group-membership-write.repository';
import { GroupMemberRoleValueObject } from '@contexts/group-members/domain/value-objects/group-member-role/group-member-role.value-object';
import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { BaseCommandHandler, DateValueObject } from '@sisques-labs/nestjs-kit';

@CommandHandler(AddGroupMemberCommand)
export class AddGroupMemberHandler
  extends BaseCommandHandler<AddGroupMemberCommand, GroupMembershipAggregate>
  implements ICommandHandler<AddGroupMemberCommand>
{
  private readonly logger = new Logger(AddGroupMemberHandler.name);

  constructor(
    @Inject(GROUP_MEMBERSHIP_WRITE_REPOSITORY)
    private readonly repository: IGroupMembershipWriteRepository,
    private readonly assertExists: AssertGroupMembershipExistsService,
    eventBus: EventBus,
  ) {
    super(eventBus);
  }

  async execute(command: AddGroupMemberCommand): Promise<void> {
    const aggregate = await this.assertExists.execute(command.groupId);

    const groupMember = new GroupMember(
      command.userId,
      new GroupMemberRoleValueObject(GroupMemberRole.MEMBER),
      new DateValueObject(new Date()),
    );

    aggregate.addMember(groupMember);

    await this.repository.save(aggregate);
    await this.publishEvents(aggregate);

    this.logger.log(
      `User ${command.userId.value} added to group ${command.groupId.value}`,
    );
  }
}
