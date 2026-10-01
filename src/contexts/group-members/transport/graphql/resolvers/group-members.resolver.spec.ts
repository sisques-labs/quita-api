import { GroupMembersListQuery } from '@contexts/group-members/application/queries/group-members-list/group-members-list.query';
import { GroupMembershipBuilder } from '@contexts/group-members/domain/builders/group-membership.builder';
import { GroupMemberRole } from '@contexts/group-members/domain/enums/group-member-role.enum';
import { GroupMemberAccessDeniedException } from '@contexts/group-members/domain/exceptions/group-member-access-denied.exception';
import { GroupMemberGraphQLMapper } from '@contexts/group-members/transport/graphql/mappers/group-member-graphql.mapper';
import { GroupMembersResolver } from '@contexts/group-members/transport/graphql/resolvers/group-members.resolver';
import { QueryBus } from '@nestjs/cqrs';
import { Mocked } from 'vitest';

const GROUP_ID = '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11';

describe('GroupMembersResolver', () => {
  let queryBus: Mocked<QueryBus>;
  let resolver: GroupMembersResolver;

  beforeEach(() => {
    queryBus = { execute: vi.fn() } as unknown as Mocked<QueryBus>;
    resolver = new GroupMembersResolver(
      queryBus,
      new GroupMemberGraphQLMapper(),
    );
  });

  it('dispatches the list query with the authenticated user as requester', async () => {
    const joinedAt = new Date('2026-02-01T08:00:00Z');
    queryBus.execute.mockResolvedValue(
      new GroupMembershipBuilder()
        .withId(GROUP_ID)
        .withMembers([{ userId: 'A', role: GroupMemberRole.OWNER, joinedAt }])
        .buildViewModel(),
    );

    const result = await resolver.groupMembers(GROUP_ID, { userId: 'A' });

    const query = queryBus.execute.mock.calls[0][0] as GroupMembersListQuery;
    expect(query).toBeInstanceOf(GroupMembersListQuery);
    expect(query.groupId.value).toBe(GROUP_ID);
    expect(query.requesterId.value).toBe('A');
    expect(result).toEqual([
      { userId: 'A', role: GroupMemberRole.OWNER, joinedAt },
    ]);
  });

  it('propagates access denied for non-members', async () => {
    queryBus.execute.mockRejectedValue(
      new GroupMemberAccessDeniedException('N', GROUP_ID),
    );

    await expect(
      resolver.groupMembers(GROUP_ID, { userId: 'N' }),
    ).rejects.toThrow(GroupMemberAccessDeniedException);
  });
});
