import { AddGroupMemberCommand } from '@contexts/group-members/application/commands/add-group-member/add-group-member.command';
import { GroupMemberIsMemberQuery } from '@contexts/group-members/application/queries/group-member-is-member/group-member-is-member.query';
import { GroupMemberAlreadyExistsException } from '@contexts/group-members/domain/exceptions/group-member-already-exists.exception';
import { GroupMembershipFullException } from '@contexts/group-members/domain/exceptions/group-membership-full.exception';
import { AddMemberResult } from '@contexts/group-invitation-codes/application/ports/group-members.port';
import { GroupMembersBusAdapter } from '@contexts/group-invitation-codes/infrastructure/adapters/group-members-bus.adapter';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Mocked } from 'vitest';

const GROUP_ID = '5d1c8f0a-3f55-4b6a-8a27-3a8d3b0d7e22';

describe('GroupMembersBusAdapter', () => {
  let commandBus: Mocked<CommandBus>;
  let queryBus: Mocked<QueryBus>;
  let adapter: GroupMembersBusAdapter;

  beforeEach(() => {
    commandBus = { execute: vi.fn() } as unknown as Mocked<CommandBus>;
    queryBus = { execute: vi.fn() } as unknown as Mocked<QueryBus>;
    adapter = new GroupMembersBusAdapter(commandBus, queryBus);
  });

  it('asks group-members whether the user belongs to the group', async () => {
    queryBus.execute.mockResolvedValue(true);

    await expect(adapter.isMember(GROUP_ID, 'user_a')).resolves.toBe(true);

    const query = queryBus.execute.mock.calls[0][0] as GroupMemberIsMemberQuery;
    expect(query).toBeInstanceOf(GroupMemberIsMemberQuery);
    expect(query.groupId.value).toBe(GROUP_ID);
    expect(query.userId.value).toBe('user_a');
  });

  it('adds the member through AddGroupMemberCommand and reports ADDED', async () => {
    commandBus.execute.mockResolvedValue(undefined);

    await expect(adapter.addMember(GROUP_ID, 'user_a')).resolves.toBe(
      AddMemberResult.ADDED,
    );

    const command = commandBus.execute.mock
      .calls[0][0] as AddGroupMemberCommand;
    expect(command).toBeInstanceOf(AddGroupMemberCommand);
    expect(command.groupId.value).toBe(GROUP_ID);
    expect(command.userId.value).toBe('user_a');
  });

  it('maps GroupMemberAlreadyExistsException to ALREADY_MEMBER', async () => {
    commandBus.execute.mockRejectedValue(
      new GroupMemberAlreadyExistsException('user_a', GROUP_ID),
    );

    await expect(adapter.addMember(GROUP_ID, 'user_a')).resolves.toBe(
      AddMemberResult.ALREADY_MEMBER,
    );
  });

  it('lets a full group error propagate', async () => {
    commandBus.execute.mockRejectedValue(
      new GroupMembershipFullException(GROUP_ID, 6),
    );

    await expect(adapter.addMember(GROUP_ID, 'user_a')).rejects.toThrow(
      GroupMembershipFullException,
    );
  });
});
