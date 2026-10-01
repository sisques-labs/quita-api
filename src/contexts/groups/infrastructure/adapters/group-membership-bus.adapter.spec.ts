import { CreateGroupMembershipCommand } from '@contexts/group-members/application/commands/create-group-membership/create-group-membership.command';
import { DeleteGroupMembershipCommand } from '@contexts/group-members/application/commands/delete-group-membership/delete-group-membership.command';
import { GroupMemberIsMemberQuery } from '@contexts/group-members/application/queries/group-member-is-member/group-member-is-member.query';
import { GroupMembershipFindGroupIdsByUserQuery } from '@contexts/group-members/application/queries/group-membership-find-group-ids-by-user/group-membership-find-group-ids-by-user.query';
import { GroupMembershipBusAdapter } from '@contexts/groups/infrastructure/adapters/group-membership-bus.adapter';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Mocked } from 'vitest';

const GROUP_ID = '5d1c8f0a-3f55-4b6a-8a27-3a8d3b0d7e22';

describe('GroupMembershipBusAdapter', () => {
  let commandBus: Mocked<CommandBus>;
  let queryBus: Mocked<QueryBus>;
  let adapter: GroupMembershipBusAdapter;

  beforeEach(() => {
    commandBus = { execute: vi.fn() } as unknown as Mocked<CommandBus>;
    queryBus = { execute: vi.fn() } as unknown as Mocked<QueryBus>;
    adapter = new GroupMembershipBusAdapter(commandBus, queryBus);
  });

  it('creates the owner membership through group-members', async () => {
    commandBus.execute.mockResolvedValue(undefined);

    await expect(
      adapter.createMembership(GROUP_ID, 'user_owner'),
    ).resolves.toBeUndefined();

    const command = commandBus.execute.mock
      .calls[0][0] as CreateGroupMembershipCommand;
    expect(command).toBeInstanceOf(CreateGroupMembershipCommand);
    expect(command.groupId.value).toBe(GROUP_ID);
    expect(command.ownerId.value).toBe('user_owner');
  });

  it('propagates a failing membership creation', async () => {
    commandBus.execute.mockRejectedValue(new Error('boom'));

    await expect(
      adapter.createMembership(GROUP_ID, 'user_owner'),
    ).rejects.toThrow('boom');
  });

  it('asks group-members whether a user belongs to the group', async () => {
    queryBus.execute.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    await expect(adapter.isMember(GROUP_ID, 'user_a')).resolves.toBe(true);
    await expect(adapter.isMember(GROUP_ID, 'stranger')).resolves.toBe(false);

    const query = queryBus.execute.mock.calls[0][0] as GroupMemberIsMemberQuery;
    expect(query).toBeInstanceOf(GroupMemberIsMemberQuery);
    expect(query.groupId.value).toBe(GROUP_ID);
    expect(query.userId.value).toBe('user_a');
  });

  it('lists the group ids of a user', async () => {
    queryBus.execute.mockResolvedValue([GROUP_ID]);

    await expect(adapter.listGroupIdsForUser('user_a')).resolves.toEqual([
      GROUP_ID,
    ]);

    const query = queryBus.execute.mock
      .calls[0][0] as GroupMembershipFindGroupIdsByUserQuery;
    expect(query).toBeInstanceOf(GroupMembershipFindGroupIdsByUserQuery);
    expect(query.userId.value).toBe('user_a');
  });

  it('deletes the roster of a group through group-members', async () => {
    commandBus.execute.mockResolvedValue(undefined);

    await expect(adapter.deleteMemberships(GROUP_ID)).resolves.toBeUndefined();

    expect(commandBus.execute).toHaveBeenCalledTimes(1);
    const command = commandBus.execute.mock
      .calls[0][0] as DeleteGroupMembershipCommand;
    expect(command).toBeInstanceOf(DeleteGroupMembershipCommand);
    expect(command.groupId.value).toBe(GROUP_ID);
  });

  it('propagates a failing membership deletion', async () => {
    commandBus.execute.mockRejectedValue(new Error('boom'));

    await expect(adapter.deleteMemberships(GROUP_ID)).rejects.toThrow('boom');
  });
});
