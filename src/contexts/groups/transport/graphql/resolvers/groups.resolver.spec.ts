import { CreateGroupCommand } from '@contexts/groups/application/commands/create-group/create-group.command';
import { GroupFindByIdQuery } from '@contexts/groups/application/queries/group-find-by-id/group-find-by-id.query';
import { GroupsFindOwnQuery } from '@contexts/groups/application/queries/groups-find-own/groups-find-own.query';
import { GroupBuilder } from '@contexts/groups/domain/builders/group.builder';
import { GroupAccessDeniedException } from '@contexts/groups/domain/exceptions/group-access-denied.exception';
import { GroupGraphQLMapper } from '@contexts/groups/transport/graphql/mappers/group-graphql.mapper';
import { GroupsResolver } from '@contexts/groups/transport/graphql/resolvers/groups.resolver';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { MutationResponseGraphQLMapper } from '@sisques-labs/nestjs-kit/graphql';
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

describe('GroupsResolver', () => {
  let commandBus: Mocked<CommandBus>;
  let queryBus: Mocked<QueryBus>;
  let resolver: GroupsResolver;

  beforeEach(() => {
    commandBus = { execute: vi.fn() } as unknown as Mocked<CommandBus>;
    queryBus = { execute: vi.fn() } as unknown as Mocked<QueryBus>;
    resolver = new GroupsResolver(
      commandBus,
      queryBus,
      new GroupGraphQLMapper(),
      new MutationResponseGraphQLMapper(),
    );
  });

  it('creates a group owned by the authenticated user, never by input', async () => {
    commandBus.execute.mockResolvedValue(GROUP_ID);

    const response = await resolver.createGroup(
      { name: 'Home' },
      { userId: 'A' },
    );

    const command = commandBus.execute.mock.calls[0][0] as CreateGroupCommand;
    expect(command).toBeInstanceOf(CreateGroupCommand);
    expect(command.name.value).toBe('Home');
    expect(command.ownerId.value).toBe('A');
    expect(response).toEqual({
      success: true,
      message: 'Group created successfully',
      id: GROUP_ID,
    });
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
