import { GroupMembersBusAdapter } from '@contexts/balances/infrastructure/adapters/group-members-bus.adapter';
import { GroupMemberIsMemberQuery } from '@contexts/group-members/application/queries/group-member-is-member/group-member-is-member.query';
import { GroupMembersFindByGroupIdQuery } from '@contexts/group-members/application/queries/group-members-find-by-group-id/group-members-find-by-group-id.query';
import { GroupMembershipViewModel } from '@contexts/group-members/domain/view-models/group-membership.view-model';
import { QueryBus } from '@nestjs/cqrs';
import { Mocked } from 'vitest';

const GROUP_ID = '5d1c8f0a-3f55-4b6a-8a27-3a8d3b0d7e22';

describe('GroupMembersBusAdapter (balances)', () => {
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

  it('lists the user ids of the roster', async () => {
    const joinedAt = new Date('2026-03-01T10:00:00Z');
    queryBus.execute.mockResolvedValue(
      new GroupMembershipViewModel(GROUP_ID, joinedAt, joinedAt, 2, [
        { userId: 'user_a', role: 'OWNER', joinedAt },
        { userId: 'user_b', role: 'MEMBER', joinedAt },
      ]),
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
});
