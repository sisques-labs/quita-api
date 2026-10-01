import { randomUUID } from 'node:crypto';

import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Criteria, FilterOperator } from '@sisques-labs/nestjs-kit';

import { AddGroupMemberCommand } from '../../../src/contexts/group-members/application/commands/add-group-member/add-group-member.command';
import { CreateGroupMembershipCommand } from '../../../src/contexts/group-members/application/commands/create-group-membership/create-group-membership.command';
import { DeleteGroupMembershipCommand } from '../../../src/contexts/group-members/application/commands/delete-group-membership/delete-group-membership.command';
import { GroupMemberIsMemberQuery } from '../../../src/contexts/group-members/application/queries/group-member-is-member/group-member-is-member.query';
import { GroupMembersFindByGroupIdQuery } from '../../../src/contexts/group-members/application/queries/group-members-find-by-group-id/group-members-find-by-group-id.query';
import { GroupMembersListQuery } from '../../../src/contexts/group-members/application/queries/group-members-list/group-members-list.query';
import { GroupMembershipFindGroupIdsByUserQuery } from '../../../src/contexts/group-members/application/queries/group-membership-find-group-ids-by-user/group-membership-find-group-ids-by-user.query';
import { GroupMember } from '../../../src/contexts/group-members/domain/entities/group-member';
import { GroupMemberRole } from '../../../src/contexts/group-members/domain/enums/group-member-role.enum';
import { GroupMemberAccessDeniedException } from '../../../src/contexts/group-members/domain/exceptions/group-member-access-denied.exception';
import { GroupMemberAlreadyExistsException } from '../../../src/contexts/group-members/domain/exceptions/group-member-already-exists.exception';
import { GroupMembershipConcurrencyException } from '../../../src/contexts/group-members/domain/exceptions/group-membership-concurrency.exception';
import { GroupMembershipFullException } from '../../../src/contexts/group-members/domain/exceptions/group-membership-full.exception';
import {
  GROUP_MEMBERSHIP_WRITE_REPOSITORY,
  IGroupMembershipWriteRepository,
} from '../../../src/contexts/group-members/domain/repositories/write/group-membership-write.repository';
import { GroupMembersModule } from '../../../src/contexts/group-members/group-members.module';
import { truncateAll } from '../../helpers/db-reset';
import {
  createIntegrationModule,
  IntegrationContext,
} from '../../helpers/integration-bootstrap';

const member = (userId: string): GroupMember =>
  GroupMember.fromPrimitives({
    userId,
    role: GroupMemberRole.MEMBER,
    joinedAt: new Date(),
  });

describe('group-members persistence (integration)', () => {
  let ctx: IntegrationContext;
  let commands: CommandBus;
  let queries: QueryBus;
  let repository: IGroupMembershipWriteRepository;

  beforeAll(async () => {
    ctx = await createIntegrationModule({ imports: [GroupMembersModule] });
    commands = ctx.module.get(CommandBus);
    queries = ctx.module.get(QueryBus);
    repository = ctx.module.get(GROUP_MEMBERSHIP_WRITE_REPOSITORY);
  });

  afterAll(async () => {
    await ctx.close();
  });

  beforeEach(async () => {
    await truncateAll(ctx.dataSource);
  });

  const createGroup = async (ownerId = 'owner'): Promise<string> => {
    const groupId = randomUUID();
    await commands.execute(
      new CreateGroupMembershipCommand({ groupId, ownerId }),
    );
    return groupId;
  };

  const rosterOf = async (groupId: string): Promise<string[]> => {
    const roster = await queries.execute(
      new GroupMembersFindByGroupIdQuery({ groupId }),
    );
    return roster.members.map((m: { userId: string }) => m.userId);
  };

  it('creates a roster with the owner and answers membership checks', async () => {
    const groupId = await createGroup('owner');

    await expect(
      queries.execute(
        new GroupMemberIsMemberQuery({ groupId, userId: 'owner' }),
      ),
    ).resolves.toBe(true);
    await expect(
      queries.execute(
        new GroupMemberIsMemberQuery({ groupId, userId: 'stranger' }),
      ),
    ).resolves.toBe(false);
    await expect(rosterOf(groupId)).resolves.toEqual(['owner']);
  });

  it('lists the groups of a user, and only theirs', async () => {
    const first = await createGroup('alice');
    const second = await createGroup('alice');
    await createGroup('bob');

    const ids = await queries.execute(
      new GroupMembershipFindGroupIdsByUserQuery({ userId: 'alice' }),
    );

    expect([...ids].sort()).toEqual([first, second].sort());
  });

  it('joins a second member, then rejects a third leaving the roster unchanged', async () => {
    const groupId = await createGroup('owner');
    await commands.execute(
      new AddGroupMemberCommand({ groupId, userId: 'guest' }),
    );

    await expect(
      commands.execute(new AddGroupMemberCommand({ groupId, userId: 'third' })),
    ).rejects.toThrow(GroupMembershipFullException);

    await expect(rosterOf(groupId)).resolves.toEqual(['owner', 'guest']);
  });

  it('does not duplicate a user who joins twice', async () => {
    const groupId = await createGroup('owner');
    await commands.execute(
      new AddGroupMemberCommand({ groupId, userId: 'guest' }),
    );

    await expect(
      commands.execute(new AddGroupMemberCommand({ groupId, userId: 'guest' })),
    ).rejects.toThrow(GroupMemberAlreadyExistsException);

    await expect(rosterOf(groupId)).resolves.toEqual(['owner', 'guest']);
  });

  it('lists members for a member and denies a non-member', async () => {
    const groupId = await createGroup('owner');

    const roster = await queries.execute(
      new GroupMembersListQuery({ groupId, requesterId: 'owner' }),
    );
    expect(roster.members.map((m: { userId: string }) => m.userId)).toEqual([
      'owner',
    ]);
    await expect(
      queries.execute(
        new GroupMembersListQuery({ groupId, requesterId: 'stranger' }),
      ),
    ).rejects.toThrow(GroupMemberAccessDeniedException);
  });

  it('bumps the version on every save', async () => {
    const groupId = await createGroup('owner');
    const before = (await repository.findById(groupId))!;

    await commands.execute(
      new AddGroupMemberCommand({ groupId, userId: 'guest' }),
    );
    const after = (await repository.findById(groupId))!;

    expect(after.version.value).toBe(before.version.value + 1);
  });

  it('keeps the member limit under concurrent joins (optimistic lock)', async () => {
    const groupId = await createGroup('owner');
    const first = (await repository.findById(groupId))!;
    const second = (await repository.findById(groupId))!;
    first.addMember(member('alice'));
    second.addMember(member('bob'));

    const results = await Promise.allSettled([
      repository.save(first),
      repository.save(second),
    ]);

    const rejected = results.filter((r) => r.status === 'rejected');
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
      GroupMembershipConcurrencyException,
    );
    await expect(rosterOf(groupId)).resolves.toHaveLength(2);
  });

  it('keeps the member limit when two join commands race', async () => {
    const groupId = await createGroup('owner');

    const results = await Promise.allSettled([
      commands.execute(new AddGroupMemberCommand({ groupId, userId: 'alice' })),
      commands.execute(new AddGroupMemberCommand({ groupId, userId: 'bob' })),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
    await expect(rosterOf(groupId)).resolves.toHaveLength(2);
  });

  it('finds rosters by criteria and deletes them', async () => {
    const groupId = await createGroup('owner');
    await createGroup('someone');

    const found = await repository.findByCriteria(
      new Criteria(
        [{ field: 'groupId', operator: FilterOperator.EQUALS, value: groupId }],
        [],
        { page: 1, perPage: 10 },
      ),
    );
    expect(found.total).toBe(1);
    expect(found.items[0].toPrimitives().members.map((m) => m.userId)).toEqual([
      'owner',
    ]);

    await repository.delete(groupId);
    await expect(repository.findById(groupId)).resolves.toBeNull();
    await expect(
      queries.execute(
        new GroupMemberIsMemberQuery({ groupId, userId: 'owner' }),
      ),
    ).resolves.toBe(false);
  });

  const rowCounts = async (groupId: string) => {
    const [memberships] = await ctx.dataSource.query(
      'SELECT count(*)::int AS n FROM group_memberships WHERE group_id = $1',
      [groupId],
    );
    const [members] = await ctx.dataSource.query(
      'SELECT count(*)::int AS n FROM group_members WHERE group_id = $1',
      [groupId],
    );
    return { memberships: memberships.n, members: members.n };
  };

  it('deletes a roster with its members and leaves other groups untouched', async () => {
    const groupId = await createGroup('owner');
    await commands.execute(
      new AddGroupMemberCommand({ groupId, userId: 'guest' }),
    );
    const other = await createGroup('someone');

    await commands.execute(new DeleteGroupMembershipCommand({ groupId }));

    await expect(rowCounts(groupId)).resolves.toEqual({
      memberships: 0,
      members: 0,
    });
    await expect(repository.findById(groupId)).resolves.toBeNull();
    await expect(rowCounts(other)).resolves.toEqual({
      memberships: 1,
      members: 1,
    });
    await expect(rosterOf(other)).resolves.toEqual(['someone']);
  });

  it('is idempotent when the group has no roster', async () => {
    const groupId = randomUUID();
    const other = await createGroup('someone');

    await expect(
      commands.execute(new DeleteGroupMembershipCommand({ groupId })),
    ).resolves.toBeUndefined();
    await expect(
      commands.execute(new DeleteGroupMembershipCommand({ groupId })),
    ).resolves.toBeUndefined();

    await expect(rosterOf(other)).resolves.toEqual(['someone']);
  });
});
