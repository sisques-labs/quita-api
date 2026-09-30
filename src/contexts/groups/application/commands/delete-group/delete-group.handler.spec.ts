import { DeleteGroupCommand } from '@contexts/groups/application/commands/delete-group/delete-group.command';
import { DeleteGroupHandler } from '@contexts/groups/application/commands/delete-group/delete-group.handler';
import { GroupMembershipPort } from '@contexts/groups/application/ports/group-membership.port';
import { AssertGroupExistsService } from '@contexts/groups/application/services/write/assert-group-exists.service';
import { GroupAggregate } from '@contexts/groups/domain/aggregates/group.aggregate';
import { GroupBuilder } from '@contexts/groups/domain/builders/group.builder';
import { GroupDeletedEvent } from '@contexts/groups/domain/events/group-deleted/group-deleted.event';
import { GroupNotFoundException } from '@contexts/groups/domain/exceptions/group-not-found.exception';
import { GroupWriteRepository } from '@contexts/groups/domain/repositories/write/group-write.repository';
import { EventBus } from '@nestjs/cqrs';
import { Mocked } from 'vitest';

const GROUP_ID = '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11';

describe('DeleteGroupHandler', () => {
  let repository: Mocked<GroupWriteRepository>;
  let assertGroupExistsService: Mocked<AssertGroupExistsService>;
  let membershipPort: Mocked<GroupMembershipPort>;
  let eventBus: Mocked<EventBus>;
  let handler: DeleteGroupHandler;
  let group: GroupAggregate;
  let publishedEvents: unknown[];

  beforeEach(() => {
    group = new GroupBuilder()
      .withId(GROUP_ID)
      .withName('Home')
      .withCreatedBy('user_owner')
      .build();
    repository = {
      delete: vi.fn(),
    } as unknown as Mocked<GroupWriteRepository>;
    assertGroupExistsService = {
      execute: vi.fn().mockResolvedValue(group),
    } as unknown as Mocked<AssertGroupExistsService>;
    membershipPort = {
      deleteMemberships: vi.fn(),
    } as unknown as Mocked<GroupMembershipPort>;
    publishedEvents = [];
    // Snapshot events: AggregateRoot.commit() clears the same array reference.
    eventBus = {
      publishAll: vi.fn(async (events: unknown[]) => {
        publishedEvents.push(...events);
      }),
    } as unknown as Mocked<EventBus>;
    handler = new DeleteGroupHandler(
      repository,
      assertGroupExistsService,
      membershipPort,
      eventBus,
    );
  });

  it('deletes the group and memberships, then publishes GroupDeletedEvent', async () => {
    const groupId = await handler.execute(
      new DeleteGroupCommand({ groupId: GROUP_ID }),
    );

    expect(groupId).toBe(GROUP_ID);
    expect(assertGroupExistsService.execute).toHaveBeenCalledWith(GROUP_ID);
    expect(repository.delete).toHaveBeenCalledWith(GROUP_ID);
    expect(membershipPort.deleteMemberships).toHaveBeenCalledWith(GROUP_ID);
    expect(eventBus.publishAll).toHaveBeenCalledTimes(1);
    expect(publishedEvents).toHaveLength(1);
    expect(publishedEvents[0]).toBeInstanceOf(GroupDeletedEvent);
  });

  it('propagates GroupNotFoundException without deleting anything', async () => {
    assertGroupExistsService.execute.mockRejectedValue(
      new GroupNotFoundException(GROUP_ID),
    );

    await expect(
      handler.execute(new DeleteGroupCommand({ groupId: GROUP_ID })),
    ).rejects.toThrow(GroupNotFoundException);

    expect(repository.delete).not.toHaveBeenCalled();
    expect(membershipPort.deleteMemberships).not.toHaveBeenCalled();
    expect(eventBus.publishAll).not.toHaveBeenCalled();
  });

  it('still publishes the event when membership cleanup fails', async () => {
    membershipPort.deleteMemberships.mockRejectedValue(
      new Error('membership unavailable'),
    );

    const groupId = await handler.execute(
      new DeleteGroupCommand({ groupId: GROUP_ID }),
    );

    expect(groupId).toBe(GROUP_ID);
    expect(repository.delete).toHaveBeenCalledWith(GROUP_ID);
    expect(eventBus.publishAll).toHaveBeenCalledTimes(1);
  });

  it('rejects an invalid group id at command construction, before any write', () => {
    expect(() => new DeleteGroupCommand({ groupId: 'not-a-uuid' })).toThrow();
    expect(repository.delete).not.toHaveBeenCalled();
  });
});
