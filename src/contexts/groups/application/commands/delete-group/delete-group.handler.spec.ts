import { DeleteGroupCommand } from '@contexts/groups/application/commands/delete-group/delete-group.command';
import { DeleteGroupHandler } from '@contexts/groups/application/commands/delete-group/delete-group.handler';
import { MEMBERSHIP_CLEANUP_RETRY_DELAY_MS } from '@contexts/groups/application/constants/membership-cleanup-retry-delay-ms.constant';
import { GroupMembershipPort } from '@contexts/groups/application/ports/group-membership.port';
import { AssertGroupExistsService } from '@contexts/groups/application/services/write/assert-group-exists/assert-group-exists.service';
import { GroupAggregate } from '@contexts/groups/domain/aggregates/group.aggregate';
import { GroupBuilder } from '@contexts/groups/domain/builders/group.builder';
import { GroupDeletedEvent } from '@contexts/groups/domain/events/group-deleted/group-deleted.event';
import { GroupNotFoundException } from '@contexts/groups/domain/exceptions/group-not-found.exception';
import { IGroupWriteRepository } from '@contexts/groups/domain/repositories/write/group-write.repository';
import { EventBus } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { Mocked, MockInstance } from 'vitest';

const GROUP_ID = '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11';

describe('DeleteGroupHandler', () => {
  let repository: Mocked<IGroupWriteRepository>;
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
    } as unknown as Mocked<IGroupWriteRepository>;
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
    expect(assertGroupExistsService.execute).toHaveBeenCalledWith(
      expect.objectContaining({ value: GROUP_ID }),
    );
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

  describe('membership cleanup retry', () => {
    let errorSpy: MockInstance;
    let warnSpy: MockInstance;

    beforeEach(() => {
      vi.useFakeTimers();
      errorSpy = vi
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => undefined);
      warnSpy = vi
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation(() => undefined);
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    const run = async () => {
      const pending = handler.execute(
        new DeleteGroupCommand({ groupId: GROUP_ID }),
      );
      await vi.runAllTimersAsync();
      return pending;
    };

    it('calls deleteMemberships once when the first attempt succeeds', async () => {
      await expect(run()).resolves.toBe(GROUP_ID);

      expect(membershipPort.deleteMemberships).toHaveBeenCalledTimes(1);
      expect(errorSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('retries after a failure and succeeds without logging an error', async () => {
      membershipPort.deleteMemberships
        .mockRejectedValueOnce(new Error('membership unavailable'))
        .mockResolvedValueOnce(undefined);

      await expect(run()).resolves.toBe(GROUP_ID);

      expect(membershipPort.deleteMemberships).toHaveBeenCalledTimes(2);
      expect(errorSpy).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(publishedEvents).toHaveLength(1);
    });

    it('gives up after 3 attempts, logs one error, still publishes and returns the id', async () => {
      membershipPort.deleteMemberships.mockRejectedValue(
        new Error('membership unavailable'),
      );

      await expect(run()).resolves.toBe(GROUP_ID);

      expect(repository.delete).toHaveBeenCalledWith(GROUP_ID);
      expect(membershipPort.deleteMemberships).toHaveBeenCalledTimes(3);
      expect(errorSpy).toHaveBeenCalledTimes(1);
      const [message] = errorSpy.mock.calls[0] as [string];
      expect(message).toContain(GROUP_ID);
      expect(message).toContain('3');
      expect(publishedEvents).toHaveLength(1);
      expect(publishedEvents[0]).toBeInstanceOf(GroupDeletedEvent);
    });

    it('waits between attempts instead of retrying immediately', async () => {
      membershipPort.deleteMemberships.mockRejectedValue(new Error('down'));

      const pending = handler.execute(
        new DeleteGroupCommand({ groupId: GROUP_ID }),
      );
      await vi.advanceTimersByTimeAsync(0);
      expect(membershipPort.deleteMemberships).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(MEMBERSHIP_CLEANUP_RETRY_DELAY_MS);
      expect(membershipPort.deleteMemberships).toHaveBeenCalledTimes(2);

      await vi.runAllTimersAsync();
      await pending;
      expect(membershipPort.deleteMemberships).toHaveBeenCalledTimes(3);
    });
  });

  it('rejects an invalid group id at command construction, before any write', () => {
    expect(() => new DeleteGroupCommand({ groupId: 'not-a-uuid' })).toThrow();
    expect(repository.delete).not.toHaveBeenCalled();
  });
});
