import { GroupMembershipBuilder } from '@contexts/group-members/domain/builders/group-membership.builder';
import { GroupMemberRole } from '@contexts/group-members/domain/enums/group-member-role.enum';
import { GroupMemberGraphQLMapper } from '@contexts/group-members/transport/graphql/mappers/group-member-graphql.mapper';

describe('GroupMemberGraphQLMapper', () => {
  it('maps every roster line to a GraphQL object', () => {
    const joinedAt = new Date('2026-02-01T08:00:00Z');
    const viewModel = new GroupMembershipBuilder()
      .withId('0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11')
      .withMembers([
        { userId: 'A', role: GroupMemberRole.OWNER, joinedAt },
        { userId: 'B', role: GroupMemberRole.MEMBER, joinedAt },
      ])
      .buildViewModel();

    const objects = new GroupMemberGraphQLMapper().toObjects(viewModel);

    expect(objects).toEqual([
      { userId: 'A', role: GroupMemberRole.OWNER, joinedAt },
      { userId: 'B', role: GroupMemberRole.MEMBER, joinedAt },
    ]);
  });
});
