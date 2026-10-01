import { DeleteGroupCommand } from '@contexts/groups/application/commands/delete-group/delete-group.command';
import { MEMBERSHIP_CLEANUP_MAX_ATTEMPTS } from '@contexts/groups/application/constants/membership-cleanup-max-attempts.constant';
import { MEMBERSHIP_CLEANUP_RETRY_DELAY_MS } from '@contexts/groups/application/constants/membership-cleanup-retry-delay-ms.constant';
import {
  GROUP_MEMBERSHIP_PORT,
  GroupMembershipPort,
} from '@contexts/groups/application/ports/group-membership.port';
import { AssertGroupExistsService } from '@contexts/groups/application/services/write/assert-group-exists/assert-group-exists.service';
import { GroupAggregate } from '@contexts/groups/domain/aggregates/group.aggregate';
import {
  GROUP_WRITE_REPOSITORY,
  IGroupWriteRepository,
} from '@contexts/groups/domain/repositories/write/group-write.repository';
import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { BaseCommandHandler } from '@sisques-labs/nestjs-kit';

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Deletes the group and, on a best-effort basis, its membership roster.
 *
 * Ordering: the group row is hard-deleted FIRST, then the roster is cleaned
 * through `GroupMembershipPort.deleteMemberships` (idempotent on the members
 * side). Cleanup is retried up to `MEMBERSHIP_CLEANUP_MAX_ATTEMPTS` times in
 * total with a short fixed delay; only after the last failure is a single
 * error logged. The failure is never rethrown: the event is still published
 * and the group id returned, so the outcome seen by the caller does not
 * depend on the cleanup.
 *
 * Known trade-off: if every attempt fails, an orphan roster stays in the
 * database and nothing reconciles it automatically. It is harmless today
 * because `GroupsFindOwnHandler` resolves groups through `findByIds`, which
 * returns nothing for a missing group row, and every other handler asserts the
 * group exists first.
 */
@CommandHandler(DeleteGroupCommand)
export class DeleteGroupHandler
  extends BaseCommandHandler<DeleteGroupCommand, GroupAggregate>
  implements ICommandHandler<DeleteGroupCommand, string>
{
  private readonly logger = new Logger(DeleteGroupHandler.name);

  constructor(
    @Inject(GROUP_WRITE_REPOSITORY)
    private readonly repository: IGroupWriteRepository,
    private readonly assertGroupExistsService: AssertGroupExistsService,
    @Inject(GROUP_MEMBERSHIP_PORT)
    private readonly membershipPort: GroupMembershipPort,
    eventBus: EventBus,
  ) {
    super(eventBus);
  }

  async execute(command: DeleteGroupCommand): Promise<string> {
    const group = await this.assertGroupExistsService.execute(command.groupId);

    await this.repository.delete(group.id.value);

    group.delete();

    await this.deleteMembershipsBestEffort(group.id.value);

    await this.publishEvents(group);

    this.logger.log(`Group ${group.id.value} deleted`);

    return group.id.value;
  }

  private async deleteMembershipsBestEffort(groupId: string): Promise<void> {
    for (let attempt = 1; ; attempt++) {
      try {
        await this.membershipPort.deleteMemberships(groupId);
        return;
      } catch (error) {
        if (attempt >= MEMBERSHIP_CLEANUP_MAX_ATTEMPTS) {
          this.logger.error(
            `Could not delete memberships for group ${groupId} after ${attempt} attempts`,
            error instanceof Error ? error.stack : undefined,
          );
          return;
        }
        this.logger.warn(
          `Membership cleanup for group ${groupId} failed (attempt ${attempt}/${MEMBERSHIP_CLEANUP_MAX_ATTEMPTS}), retrying`,
        );
        await sleep(MEMBERSHIP_CLEANUP_RETRY_DELAY_MS);
      }
    }
  }
}
