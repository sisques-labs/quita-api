import { GroupMemberIsMemberQuery } from '@contexts/group-members/application/queries/group-member-is-member/group-member-is-member.query';
import { GroupMembersFindByGroupIdQuery } from '@contexts/group-members/application/queries/group-members-find-by-group-id/group-members-find-by-group-id.query';
import { GroupMembershipBuilder } from '@contexts/group-members/domain/builders/group-membership.builder';
import { GroupMemberRole } from '@contexts/group-members/domain/enums/group-member-role.enum';
import { GroupMembershipNotFoundException } from '@contexts/group-members/domain/exceptions/group-membership-not-found.exception';
import { GroupMembersBusAdapter } from '@contexts/expenses/infrastructure/adapters/group-members-bus.adapter';
import { QueryBus } from '@nestjs/cqrs';
import { Mocked } from 'vitest';

const GROUP_ID = '5d1c8f0a-3f55-4b6a-8a27-3a8d3b0d7e22';

describe('GroupMembersBusAdapter (expenses)', () => {
  let queryBus: Mocked<QueryBus>;
  let adapter: GroupMembersBusAdapter;

  beforeEach(() => {
    queryBus = { execute: vi.fn() } as unknown as Mocked<QueryBus>;
    adapter = new GroupMembersBusAdapter(queryBus);
  });

  it('asks group-members whether the user belongs to the group', async () => {
    queryBus.execute.mockResolvedValue(true);

    await expect(adapter.isMember(GROUP_ID, 'user_a')).resolves.toBe(true);

    const query = queryBus.execute.mock.calls[0][0] as GroupMemberIsMemberQuery;
    expect(query).toBeInstanceOf(GroupMemberIsMemberQuery);
    expect(query.groupId.value).toBe(GROUP_ID);
    expect(query.userId.value).toBe('user_a');
  });

  it('reports a non-member as false', async () => {
    queryBus.execute.mockResolvedValue(false);

    await expect(adapter.isMember(GROUP_ID, 'stranger')).resolves.toBe(false);
  });

  it('lists the user ids of the roster in join order', async () => {
    queryBus.execute.mockResolvedValue(
      new GroupMembershipBuilder()
        .withId(GROUP_ID)
        .withMembers([
          {
            userId: 'user_a',
            role: GroupMemberRole.OWNER,
            joinedAt: new Date(),
          },
          {
            userId: 'user_b',
            role: GroupMemberRole.MEMBER,
            joinedAt: new Date(),
          },
        ])
        .buildViewModel(),
    );

    await expect(adapter.listMemberIds(GROUP_ID)).resolves.toEqual([
      'user_a',
      'user_b',
    ]);

    const query = queryBus.execute.mock
      .calls[0][0] as GroupMembersFindByGroupIdQuery;
    expect(query).toBeInstanceOf(GroupMembersFindByGroupIdQuery);
    expect(query.groupId.value).toBe(GROUP_ID);
  });

  it('lets a missing roster propagate', async () => {
    queryBus.execute.mockRejectedValue(
      new GroupMembershipNotFoundException(GROUP_ID),
    );

    await expect(adapter.listMemberIds(GROUP_ID)).rejects.toThrow(
      GroupMembershipNotFoundException,
    );
  });
});
