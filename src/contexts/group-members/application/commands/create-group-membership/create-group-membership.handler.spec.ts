import { CreateGroupMembershipCommand } from '@contexts/group-members/application/commands/create-group-membership/create-group-membership.command';
import { CreateGroupMembershipHandler } from '@contexts/group-members/application/commands/create-group-membership/create-group-membership.handler';
import { AssertGroupMembershipNotExistsService } from '@contexts/group-members/application/services/write/assert-group-membership-not-exists/assert-group-membership-not-exists.service';
import { GroupMembershipAggregate } from '@contexts/group-members/domain/aggregates/group-membership.aggregate';
import { GroupMembershipBuilder } from '@contexts/group-members/domain/builders/group-membership.builder';
import { GroupMemberRole } from '@contexts/group-members/domain/enums/group-member-role.enum';
import { GroupMembershipAlreadyExistsException } from '@contexts/group-members/domain/exceptions/group-membership-already-exists.exception';
import { GroupMembershipWriteRepository } from '@contexts/group-members/domain/repositories/write/group-membership-write.repository';
import { EventBus } from '@nestjs/cqrs';
import { Mocked } from 'vitest';

describe('CreateGroupMembershipHandler', () => {
  let repository: Mocked<GroupMembershipWriteRepository>;
  let assertNotExists: Mocked<AssertGroupMembershipNotExistsService>;
  let eventBus: Mocked<EventBus>;
  let handler: CreateGroupMembershipHandler;

  beforeEach(() => {
    repository = {
      save: vi.fn(),
    } as unknown as Mocked<GroupMembershipWriteRepository>;
    assertNotExists = {
      execute: vi.fn(),
    } as unknown as Mocked<AssertGroupMembershipNotExistsService>;
    eventBus = { publishAll: vi.fn() } as unknown as Mocked<EventBus>;
    handler = new CreateGroupMembershipHandler(
      repository,
      assertNotExists,
      new GroupMembershipBuilder(),
      eventBus,
    );
  });

  it('saves a roster holding the owner as its only member and publishes the event', async () => {
    await handler.execute(
      new CreateGroupMembershipCommand({
        groupId: '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11',
        ownerId: 'user_owner',
      }),
    );

    expect(assertNotExists.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        value: '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11',
      }),
    );
    const saved = repository.save.mock.calls[0][0] as GroupMembershipAggregate;
    const primitives = saved.toPrimitives();
    expect(primitives.id).toBe('0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11');
    expect(primitives.capacity).toBe(2);
    expect(primitives.members).toHaveLength(1);
    expect(primitives.members[0]).toMatchObject({
      userId: 'user_owner',
      role: GroupMemberRole.OWNER,
    });
    expect(eventBus.publishAll).toHaveBeenCalledTimes(1);
  });

  it('does not save when the roster already exists', async () => {
    assertNotExists.execute.mockRejectedValue(
      new GroupMembershipAlreadyExistsException(
        '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11',
      ),
    );

    await expect(
      handler.execute(
        new CreateGroupMembershipCommand({
          groupId: '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11',
          ownerId: 'user_owner',
        }),
      ),
    ).rejects.toThrow(GroupMembershipAlreadyExistsException);
    expect(repository.save).not.toHaveBeenCalled();
    expect(eventBus.publishAll).not.toHaveBeenCalled();
  });

  it('rejects an invalid group id at command construction', () => {
    expect(
      () =>
        new CreateGroupMembershipCommand({
          groupId: 'nope',
          ownerId: 'user_owner',
        }),
    ).toThrow();
  });
});
