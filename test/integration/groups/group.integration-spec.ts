import { CommandBus, QueryBus } from '@nestjs/cqrs';

import { DeleteGroupMembershipCommand } from '../../../src/contexts/group-members/application/commands/delete-group-membership/delete-group-membership.command';
import { GroupMemberIsMemberQuery } from '../../../src/contexts/group-members/application/queries/group-member-is-member/group-member-is-member.query';
import { CreateGroupMembershipCommand } from '../../../src/contexts/group-members/application/commands/create-group-membership/create-group-membership.command';
import { GroupMembersModule } from '../../../src/contexts/group-members/group-members.module';
import { CreateGroupCommand } from '../../../src/contexts/groups/application/commands/create-group/create-group.command';
import { DeleteGroupCommand } from '../../../src/contexts/groups/application/commands/delete-group/delete-group.command';
import { GroupFindByIdQuery } from '../../../src/contexts/groups/application/queries/group-find-by-id/group-find-by-id.query';
import { GroupsFindOwnQuery } from '../../../src/contexts/groups/application/queries/groups-find-own/groups-find-own.query';
import { GroupBuilder } from '../../../src/contexts/groups/domain/builders/group.builder';
import { GroupAccessDeniedException } from '../../../src/contexts/groups/domain/exceptions/group-access-denied.exception';
import { GroupNotFoundException } from '../../../src/contexts/groups/domain/exceptions/group-not-found.exception';
import {
  GROUP_WRITE_REPOSITORY,
  IGroupWriteRepository,
} from '../../../src/contexts/groups/domain/repositories/write/group-write.repository';
import { GroupsModule } from '../../../src/contexts/groups/groups.module';
import { truncateAll } from '../../helpers/db-reset';
import {
  createIntegrationModule,
  IntegrationContext,
} from '../../helpers/integration-bootstrap';

const UNKNOWN_GROUP = '9d1c2b3a-4e5f-4a6b-8c7d-0e1f2a3b4c5d';

describe('groups persistence and membership adapter (integration)', () => {
  let ctx: IntegrationContext;
  let commands: CommandBus;
  let queries: QueryBus;
  let repository: IGroupWriteRepository;

  beforeAll(async () => {
    ctx = await createIntegrationModule({
      imports: [GroupMembersModule, GroupsModule],
    });
    commands = ctx.module.get(CommandBus);
    queries = ctx.module.get(QueryBus);
    repository = ctx.module.get(GROUP_WRITE_REPOSITORY);
  });

  afterAll(async () => {
    await ctx.close();
  });

  beforeEach(async () => {
    await truncateAll(ctx.dataSource);
    vi.restoreAllMocks();
  });

  const createGroup = (name: string, ownerId: string): Promise<string> =>
    commands.execute(new CreateGroupCommand({ name, ownerId }));

  const groupCount = async (): Promise<number> => {
    const rows = await ctx.dataSource.query(
      'SELECT count(*)::int AS n FROM groups',
    );
    return rows[0].n;
  };

  it('persists the group and makes the creator its first member through the bus', async () => {
    const groupId = await createGroup('Home', 'alice');

    const stored = await repository.findById(groupId);
    expect(stored?.toPrimitives()).toMatchObject({
      id: groupId,
      name: 'Home',
      createdBy: 'alice',
    });
    await expect(
      queries.execute(
        new GroupMemberIsMemberQuery({ groupId, userId: 'alice' }),
      ),
    ).resolves.toBe(true);
    await expect(
      queries.execute(new GroupMemberIsMemberQuery({ groupId, userId: 'bob' })),
    ).resolves.toBe(false);
  });

  it('lets a member read the group and denies a non-member', async () => {
    const groupId = await createGroup('Home', 'alice');

    const group = await queries.execute(
      new GroupFindByIdQuery({ groupId, requesterId: 'alice' }),
    );
    expect(group.name).toBe('Home');
    expect(group.createdBy).toBe('alice');

    await expect(
      queries.execute(new GroupFindByIdQuery({ groupId, requesterId: 'bob' })),
    ).rejects.toThrow(GroupAccessDeniedException);
  });

  it('denies access to an unknown group id instead of revealing it does not exist', async () => {
    await expect(
      queries.execute(
        new GroupFindByIdQuery({
          groupId: UNKNOWN_GROUP,
          requesterId: 'alice',
        }),
      ),
    ).rejects.toThrow(GroupAccessDeniedException);
  });

  it('reports not found when the roster exists but the group row does not', async () => {
    const groupId = await createGroup('Home', 'alice');
    await ctx.dataSource.query('DELETE FROM groups WHERE id = $1', [groupId]);

    await expect(
      queries.execute(
        new GroupFindByIdQuery({ groupId, requesterId: 'alice' }),
      ),
    ).rejects.toThrow(GroupNotFoundException);
  });

  it('lists only the groups the requester belongs to', async () => {
    const home = await createGroup('Home', 'alice');
    const trip = await createGroup('Trip', 'alice');
    await createGroup('Other', 'bob');

    const own = await queries.execute(
      new GroupsFindOwnQuery({ requesterId: 'alice' }),
    );

    expect(own.map((g: { id: string }) => g.id).sort()).toEqual(
      [home, trip].sort(),
    );
    await expect(
      queries.execute(new GroupsFindOwnQuery({ requesterId: 'carol' })),
    ).resolves.toEqual([]);
  });

  it('deletes the group when the membership command fails (compensation)', async () => {
    const realExecute = commands.execute.bind(commands);
    vi.spyOn(commands, 'execute').mockImplementation((command: unknown) =>
      command instanceof CreateGroupMembershipCommand
        ? Promise.reject(new Error('members unavailable'))
        : realExecute(command as never),
    );

    await expect(createGroup('Home', 'alice')).rejects.toThrow(
      'members unavailable',
    );

    await expect(groupCount()).resolves.toBe(0);
  });

  it('removes the roster and members of a deleted group, leaving other groups intact', async () => {
    const groupId = await createGroup('Home', 'alice');
    const otherId = await createGroup('Trip', 'bob');

    await expect(
      commands.execute(new DeleteGroupCommand({ groupId })),
    ).resolves.toBe(groupId);

    await expect(repository.findById(groupId)).resolves.toBeNull();
    await expect(
      queries.execute(
        new GroupMemberIsMemberQuery({ groupId, userId: 'alice' }),
      ),
    ).resolves.toBe(false);
    const rows = await ctx.dataSource.query(
      'SELECT (SELECT count(*)::int FROM group_memberships WHERE group_id = $1) AS memberships, (SELECT count(*)::int FROM group_members WHERE group_id = $1) AS members',
      [groupId],
    );
    expect(rows[0]).toEqual({ memberships: 0, members: 0 });
    await expect(
      queries.execute(
        new GroupMemberIsMemberQuery({ groupId: otherId, userId: 'bob' }),
      ),
    ).resolves.toBe(true);
  });

  it('still deletes the group when the membership cleanup fails', async () => {
    const groupId = await createGroup('Home', 'alice');
    const realExecute = commands.execute.bind(commands);
    vi.spyOn(commands, 'execute').mockImplementation((command: unknown) =>
      command instanceof DeleteGroupMembershipCommand
        ? Promise.reject(new Error('members unavailable'))
        : realExecute(command as never),
    );

    await expect(
      commands.execute(new DeleteGroupCommand({ groupId })),
    ).resolves.toBe(groupId);

    await expect(repository.findById(groupId)).resolves.toBeNull();
  });

  it('saves, finds by criteria and deletes through the write repository', async () => {
    const aggregate = new GroupBuilder()
      .withId('0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11')
      .withName('Direct')
      .withCreatedBy('dave')
      .build();

    await repository.save(aggregate);
    await expect(groupCount()).resolves.toBe(1);

    await repository.delete(aggregate.id.value);
    await expect(repository.findById(aggregate.id.value)).resolves.toBeNull();
    await expect(groupCount()).resolves.toBe(0);
  });
});
