import { GroupFindByIdQuery } from '@contexts/groups/application/queries/group-find-by-id/group-find-by-id.query';
import { GroupsFindOwnQuery } from '@contexts/groups/application/queries/groups-find-own/groups-find-own.query';
import { GroupBuilder } from '@contexts/groups/domain/builders/group.builder';
import { GroupAccessDeniedException } from '@contexts/groups/domain/exceptions/group-access-denied.exception';
import { GroupGraphQLMapper } from '@contexts/groups/transport/graphql/mappers/group-graphql.mapper';
import { GroupQueriesResolver } from '@contexts/groups/transport/graphql/resolvers/group-queries.resolver';
import { QueryBus } from '@nestjs/cqrs';
import { Mocked } from 'vitest';

const GROUP_ID = '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11';
const CREATED = new Date('2026-01-01T09:00:00Z');

const groupViewModel = (id = GROUP_ID, name = 'Home') =>
  new GroupBuilder()
    .withId(id)
    .withName(name)
    .withCreatedBy('A')
    .withCreatedAt(CREATED)
    .buildViewModel();

describe('GroupQueriesResolver', () => {
  let queryBus: Mocked<QueryBus>;
  let resolver: GroupQueriesResolver;

  beforeEach(() => {
    queryBus = { execute: vi.fn() } as unknown as Mocked<QueryBus>;
    resolver = new GroupQueriesResolver(queryBus, new GroupGraphQLMapper());
  });

  it('reads a group on behalf of the authenticated user', async () => {
    queryBus.execute.mockResolvedValue(groupViewModel());

    const group = await resolver.group(GROUP_ID, { userId: 'A' });

    const query = queryBus.execute.mock.calls[0][0] as GroupFindByIdQuery;
    expect(query).toBeInstanceOf(GroupFindByIdQuery);
    expect(query.groupId.value).toBe(GROUP_ID);
    expect(query.requesterId.value).toBe('A');
    expect(group).toEqual({
      id: GROUP_ID,
      name: 'Home',
      createdBy: 'A',
      createdAt: CREATED,
    });
  });

  it('propagates access denied for non-members', async () => {
    queryBus.execute.mockRejectedValue(
      new GroupAccessDeniedException('N', GROUP_ID),
    );

    await expect(resolver.group(GROUP_ID, { userId: 'N' })).rejects.toThrow(
      GroupAccessDeniedException,
    );
  });

  it('lists the groups of the authenticated user', async () => {
    queryBus.execute.mockResolvedValue([
      groupViewModel(GROUP_ID, 'Home'),
      groupViewModel('1c7f7c1f-7f1f-4e9b-8e1b-8e7f3f4b2d22', 'Trip'),
    ]);

    const groups = await resolver.groups({ userId: 'A' });

    const query = queryBus.execute.mock.calls[0][0] as GroupsFindOwnQuery;
    expect(query).toBeInstanceOf(GroupsFindOwnQuery);
    expect(query.requesterId.value).toBe('A');
    expect(groups.map((g) => g.name)).toEqual(['Home', 'Trip']);
  });
});
