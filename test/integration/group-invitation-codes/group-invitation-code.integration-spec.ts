import { CommandBus, QueryBus } from '@nestjs/cqrs';

import { GroupMemberIsMemberQuery } from '../../../src/contexts/group-members/application/queries/group-member-is-member/group-member-is-member.query';
import { GroupMembersListQuery } from '../../../src/contexts/group-members/application/queries/group-members-list/group-members-list.query';
import { GroupMembershipFullException } from '../../../src/contexts/group-members/domain/exceptions/group-membership-full.exception';
import { GroupMembersModule } from '../../../src/contexts/group-members/group-members.module';
import { CreateGroupCommand } from '../../../src/contexts/groups/application/commands/create-group/create-group.command';
import { GroupsModule } from '../../../src/contexts/groups/groups.module';
import { GenerateInvitationCodeCommand } from '../../../src/contexts/group-invitation-codes/application/commands/generate-invitation-code/generate-invitation-code.command';
import { RedeemInvitationCodeCommand } from '../../../src/contexts/group-invitation-codes/application/commands/redeem-invitation-code/redeem-invitation-code.command';
import { RegenerateInvitationCodeCommand } from '../../../src/contexts/group-invitation-codes/application/commands/regenerate-invitation-code/regenerate-invitation-code.command';
import { GroupInvitationCodeBuilder } from '../../../src/contexts/group-invitation-codes/domain/builders/group-invitation-code.builder';
import { ActiveInvitationCodeConflictException } from '../../../src/contexts/group-invitation-codes/domain/exceptions/active-invitation-code-conflict.exception';
import { GroupInvitationAccessDeniedException } from '../../../src/contexts/group-invitation-codes/domain/exceptions/group-invitation-access-denied.exception';
import { InvitationCodeCollisionException } from '../../../src/contexts/group-invitation-codes/domain/exceptions/invitation-code-collision.exception';
import { InvitationCodeInvalidException } from '../../../src/contexts/group-invitation-codes/domain/exceptions/invitation-code-invalid.exception';
import {
  GROUP_INVITATION_CODE_WRITE_REPOSITORY,
  GroupInvitationCodeWriteRepository,
} from '../../../src/contexts/group-invitation-codes/domain/repositories/write/group-invitation-code-write.repository';
import { GroupInvitationCodesModule } from '../../../src/contexts/group-invitation-codes/group-invitation-codes.module';
import { truncateAll } from '../../helpers/db-reset';
import {
  createIntegrationModule,
  IntegrationContext,
} from '../../helpers/integration-bootstrap';

const CODE_A = '7KQ2M9XZ';
const CODE_B = 'ABCD2345';

describe('group invitation codes persistence and adapters (integration)', () => {
  let ctx: IntegrationContext;
  let commands: CommandBus;
  let queries: QueryBus;
  let repository: GroupInvitationCodeWriteRepository;

  beforeAll(async () => {
    ctx = await createIntegrationModule({
      imports: [GroupMembersModule, GroupsModule, GroupInvitationCodesModule],
    });
    commands = ctx.module.get(CommandBus);
    queries = ctx.module.get(QueryBus);
    repository = ctx.module.get(GROUP_INVITATION_CODE_WRITE_REPOSITORY);
  });

  afterAll(async () => {
    await ctx.close();
  });

  beforeEach(async () => {
    await truncateAll(ctx.dataSource);
  });

  const createGroup = (ownerId: string): Promise<string> =>
    commands.execute(new CreateGroupCommand({ name: 'Home', ownerId }));

  const generate = (groupId: string, requesterId: string): Promise<string> =>
    commands.execute(
      new GenerateInvitationCodeCommand({ groupId, requesterId }),
    );

  const regenerate = (groupId: string, requesterId: string): Promise<string> =>
    commands.execute(
      new RegenerateInvitationCodeCommand({ groupId, requesterId }),
    );

  const redeem = (code: string, requesterId: string): Promise<string> =>
    commands.execute(new RedeemInvitationCodeCommand({ code, requesterId }));

  const raiseCapacity = (groupId: string, capacity: number): Promise<unknown> =>
    ctx.dataSource.query(
      'UPDATE group_memberships SET capacity = $2 WHERE group_id = $1',
      [groupId, capacity],
    );

  const isMember = (groupId: string, userId: string): Promise<boolean> =>
    queries.execute(new GroupMemberIsMemberQuery({ groupId, userId }));

  const aggregate = (groupId: string, code: string, id: string) =>
    new GroupInvitationCodeBuilder()
      .withId(id)
      .withGroupId(groupId)
      .withCode(code)
      .withCreatedBy('alice')
      .build();

  const activeRows = async (groupId: string): Promise<{ code: string }[]> =>
    ctx.dataSource.query(
      'SELECT code FROM group_invitation_codes WHERE group_id = $1 AND revoked_at IS NULL',
      [groupId],
    );

  it('generates one code per group and reuses it on the next request', async () => {
    const groupId = await createGroup('alice');

    const first = await generate(groupId, 'alice');
    const second = await generate(groupId, 'alice');

    expect(first).toMatch(/^[0-9A-HJKMNP-TV-Z]{8}$/);
    expect(second).toBe(first);
    await expect(activeRows(groupId)).resolves.toEqual([{ code: first }]);
  });

  it('denies code generation to a non-member', async () => {
    const groupId = await createGroup('alice');

    await expect(generate(groupId, 'mallory')).rejects.toThrow(
      GroupInvitationAccessDeniedException,
    );
    await expect(activeRows(groupId)).resolves.toEqual([]);
  });

  it('lets two different users redeem the same reusable code', async () => {
    const groupId = await createGroup('alice');
    await raiseCapacity(groupId, 3);
    const code = await generate(groupId, 'alice');

    await expect(redeem(code, 'bob')).resolves.toBe(groupId);
    await expect(redeem(code.toLowerCase(), 'carol')).resolves.toBe(groupId);

    await expect(isMember(groupId, 'bob')).resolves.toBe(true);
    await expect(isMember(groupId, 'carol')).resolves.toBe(true);
    const roster = await queries.execute(
      new GroupMembersListQuery({ groupId, requesterId: 'alice' }),
    );
    expect(
      roster.members.map((m: { userId: string }) => m.userId).sort(),
    ).toEqual(['alice', 'bob', 'carol']);
  });

  it('is idempotent for a user who already belongs to the group', async () => {
    const groupId = await createGroup('alice');
    const code = await generate(groupId, 'alice');

    await expect(redeem(code, 'alice')).resolves.toBe(groupId);
    await expect(redeem(code, 'bob')).resolves.toBe(groupId);
    await expect(redeem(code, 'bob')).resolves.toBe(groupId);
  });

  it('rejects an unknown code', async () => {
    await expect(redeem(CODE_A, 'bob')).rejects.toThrow(
      InvitationCodeInvalidException,
    );
  });

  it('propagates the full-group error when the roster has no room left', async () => {
    const groupId = await createGroup('alice');
    const code = await generate(groupId, 'alice');
    await redeem(code, 'bob');

    await expect(redeem(code, 'carol')).rejects.toThrow(
      GroupMembershipFullException,
    );
    await expect(isMember(groupId, 'carol')).resolves.toBe(false);
  });

  it('invalidates the old code when the code is regenerated', async () => {
    const groupId = await createGroup('alice');
    const old = await generate(groupId, 'alice');

    const fresh = await regenerate(groupId, 'alice');

    expect(fresh).not.toBe(old);
    await expect(redeem(old, 'bob')).rejects.toThrow(
      InvitationCodeInvalidException,
    );
    await expect(isMember(groupId, 'bob')).resolves.toBe(false);
    await expect(redeem(fresh, 'bob')).resolves.toBe(groupId);
    await expect(activeRows(groupId)).resolves.toEqual([{ code: fresh }]);
    const rows = await ctx.dataSource.query(
      'SELECT count(*)::int AS n FROM group_invitation_codes WHERE group_id = $1',
      [groupId],
    );
    expect(rows[0].n).toBe(2);
  });

  it('replaceActive revokes and inserts atomically, rolling both back on failure', async () => {
    const groupId = await createGroup('alice');
    await repository.replaceActive(
      null,
      aggregate(groupId, CODE_A, '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11'),
    );
    const current = (await repository.findActiveByGroupId(groupId))!;
    current.revoke(new Date());

    // Same code as the one being revoked: the insert violates UNIQUE(code).
    await expect(
      repository.replaceActive(
        current,
        aggregate(groupId, CODE_A, '1c7f7c1f-7f1f-4e9b-8e1b-8e7f3f4b2d22'),
      ),
    ).rejects.toThrow(InvitationCodeCollisionException);

    const stillActive = await repository.findActiveByGroupId(groupId);
    expect(stillActive?.code.value).toBe(CODE_A);
    expect(stillActive?.isActive()).toBe(true);
  });

  it('maps a duplicate code to a collision error and a second active code to a conflict', async () => {
    const groupA = await createGroup('alice');
    const groupB = await createGroup('bob');
    await repository.save(
      aggregate(groupA, CODE_A, '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11'),
    );

    await expect(
      repository.save(
        aggregate(groupB, CODE_A, '1c7f7c1f-7f1f-4e9b-8e1b-8e7f3f4b2d22'),
      ),
    ).rejects.toThrow(InvitationCodeCollisionException);
    await expect(
      repository.save(
        aggregate(groupA, CODE_B, '2d8f8d2f-8f2f-4fac-9f2c-9f8f4f5c3e33'),
      ),
    ).rejects.toThrow(ActiveInvitationCodeConflictException);
  });

  it('keeps exactly one active code under concurrent replaceActive calls', async () => {
    const groupId = await createGroup('alice');
    await repository.save(
      aggregate(groupId, CODE_A, '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11'),
    );

    // Both requests read the same active code before either one writes.
    const readActive = async () => {
      const previous = (await repository.findActiveByGroupId(groupId))!;
      previous.revoke(new Date());
      return previous;
    };
    const [first, second] = await Promise.all([readActive(), readActive()]);
    const results = await Promise.allSettled([
      repository.replaceActive(
        first,
        aggregate(groupId, 'CCCC2222', '1c7f7c1f-7f1f-4e9b-8e1b-8e7f3f4b2d22'),
      ),
      repository.replaceActive(
        second,
        aggregate(groupId, 'DDDD3333', '2d8f8d2f-8f2f-4fac-9f2c-9f8f4f5c3e33'),
      ),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((r) => r.status === 'rejected') as
      PromiseRejectedResult | undefined;
    expect(rejected?.reason).toBeInstanceOf(
      ActiveInvitationCodeConflictException,
    );
    await expect(activeRows(groupId)).resolves.toHaveLength(1);
  });

  it('converges racing generate commands on a single shared code', async () => {
    const groupId = await createGroup('alice');

    const codes = await Promise.all([
      generate(groupId, 'alice'),
      generate(groupId, 'alice'),
      generate(groupId, 'alice'),
    ]);

    expect(new Set(codes).size).toBe(1);
    await expect(activeRows(groupId)).resolves.toEqual([{ code: codes[0] }]);
  });
});
