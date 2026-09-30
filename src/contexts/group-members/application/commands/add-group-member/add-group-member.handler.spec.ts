import { AddGroupMemberCommand } from '@contexts/group-members/application/commands/add-group-member/add-group-member.command';
import { AddGroupMemberHandler } from '@contexts/group-members/application/commands/add-group-member/add-group-member.handler';
import { AssertGroupMembershipExistsService } from '@contexts/group-members/application/services/write/assert-group-membership-exists.service';
import { GroupMembershipBuilder } from '@contexts/group-members/domain/builders/group-membership.builder';
import { GroupMemberRole } from '@contexts/group-members/domain/enums/group-member-role.enum';
import { GroupMembershipFullException } from '@contexts/group-members/domain/exceptions/group-membership-full.exception';
import { GroupMembershipNotFoundException } from '@contexts/group-members/domain/exceptions/group-membership-not-found.exception';
import { GroupMembershipWriteRepository } from '@contexts/group-members/domain/repositories/write/group-membership-write.repository';
import { EventBus } from '@nestjs/cqrs';
import { Mocked } from 'vitest';

const roster = () =>
  new GroupMembershipBuilder()
    .withId('0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11')
    .withVersion(1)
    .withMembers([
      { userId: 'owner', role: GroupMemberRole.OWNER, joinedAt: new Date() },
    ])
    .build();

describe('AddGroupMemberHandler', () => {
  let repository: Mocked<GroupMembershipWriteRepository>;
  let assertExists: Mocked<AssertGroupMembershipExistsService>;
  let eventBus: Mocked<EventBus>;
  let handler: AddGroupMemberHandler;

  beforeEach(() => {
    repository = {
      save: vi.fn(),
    } as unknown as Mocked<GroupMembershipWriteRepository>;
    assertExists = {
      execute: vi.fn(),
    } as unknown as Mocked<AssertGroupMembershipExistsService>;
    eventBus = { publishAll: vi.fn() } as unknown as Mocked<EventBus>;
    handler = new AddGroupMemberHandler(repository, assertExists, eventBus);
  });

  it('adds the user as MEMBER, saves and publishes', async () => {
    assertExists.execute.mockResolvedValue(roster());

    await handler.execute(
      new AddGroupMemberCommand({
        groupId: '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11',
        userId: 'guest',
      }),
    );

    const saved = repository.save.mock.calls[0][0].toPrimitives();
    expect(saved.members.map((m) => [m.userId, m.role])).toEqual([
      ['owner', GroupMemberRole.OWNER],
      ['guest', GroupMemberRole.MEMBER],
    ]);
    expect(eventBus.publishAll).toHaveBeenCalledTimes(1);
  });

  it('rejects a third member without saving', async () => {
    const full = roster();
    assertExists.execute.mockResolvedValue(full);
    await handler.execute(
      new AddGroupMemberCommand({
        groupId: '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11',
        userId: 'guest',
      }),
    );
    repository.save.mockClear();
    eventBus.publishAll.mockClear();

    await expect(
      handler.execute(
        new AddGroupMemberCommand({
          groupId: '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11',
          userId: 'third',
        }),
      ),
    ).rejects.toThrow(GroupMembershipFullException);
    expect(repository.save).not.toHaveBeenCalled();
    expect(eventBus.publishAll).not.toHaveBeenCalled();
  });

  it('propagates a missing roster', async () => {
    assertExists.execute.mockRejectedValue(
      new GroupMembershipNotFoundException(
        '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11',
      ),
    );

    await expect(
      handler.execute(
        new AddGroupMemberCommand({
          groupId: '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11',
          userId: 'guest',
        }),
      ),
    ).rejects.toThrow(GroupMembershipNotFoundException);
    expect(repository.save).not.toHaveBeenCalled();
  });
});
