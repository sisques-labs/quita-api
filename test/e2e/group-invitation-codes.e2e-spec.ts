import { createE2EApp, E2EContext } from '../helpers/app-bootstrap';
import { truncateAll } from '../helpers/db-reset';

const CREATE_GROUP = `
  mutation CreateGroup($input: GroupCreateRequestDto!) {
    createGroup(input: $input) { id }
  }
`;
const GENERATE = `
  mutation Generate($input: GroupInvitationCodeGenerateRequestDto!) {
    generateInvitationCode(input: $input) { groupId code }
  }
`;
const REGENERATE = `
  mutation Regenerate($input: GroupInvitationCodeRegenerateRequestDto!) {
    regenerateInvitationCode(input: $input) { groupId code }
  }
`;
const REDEEM = `
  mutation Redeem($input: GroupInvitationCodeRedeemRequestDto!) {
    redeemInvitationCode(input: $input) { success id }
  }
`;
const GROUP_MEMBERS = `query M($id: ID!) { groupMembers(groupId: $id) { userId role } }`;

describe('Group invitation codes (e2e)', () => {
  let ctx: E2EContext;

  beforeAll(async () => {
    ctx = await createE2EApp();
  });

  afterAll(async () => {
    await ctx.close();
  });

  beforeEach(async () => {
    await truncateAll(ctx.dataSource);
  });

  const call = async (
    sub: string | null,
    query: string,
    variables: Record<string, unknown> = {},
  ) => {
    const request = ctx.http().post('/graphql').send({ query, variables });
    if (sub) {
      request.set(
        'Authorization',
        `Bearer ${await ctx.clerk.signToken({ sub })}`,
      );
    }
    return request;
  };

  const createGroup = async (sub: string): Promise<string> => {
    const res = await call(sub, CREATE_GROUP, { input: { name: 'Home' } });
    return res.body.data.createGroup.id;
  };

  const generate = async (sub: string, groupId: string): Promise<string> => {
    const res = await call(sub, GENERATE, { input: { groupId } });
    expect(res.body.errors).toBeUndefined();
    return res.body.data.generateInvitationCode.code;
  };

  it('lets a member generate a code and a second user join with it', async () => {
    const groupId = await createGroup('user_A');
    const code = await generate('user_A', groupId);
    expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]{8}$/);

    const joined = await call('user_B', REDEEM, { input: { code } });
    expect(joined.body.errors).toBeUndefined();
    expect(joined.body.data.redeemInvitationCode).toEqual({
      success: true,
      id: groupId,
    });

    const members = await call('user_A', GROUP_MEMBERS, { id: groupId });
    expect(
      members.body.data.groupMembers.map((m: { userId: string }) => m.userId),
    ).toEqual(['user_A', 'user_B']);
  });

  it('returns the same code on a repeated generate request', async () => {
    const groupId = await createGroup('user_A');

    const first = await generate('user_A', groupId);
    const second = await generate('user_A', groupId);

    expect(second).toBe(first);
  });

  it('rejects a third user once the group is full', async () => {
    const groupId = await createGroup('user_A');
    const code = await generate('user_A', groupId);
    await call('user_B', REDEEM, { input: { code } });

    const third = await call('user_C', REDEEM, { input: { code } });

    expect(third.body.errors[0].extensions.code).toBe(
      'GroupMembershipFullException',
    );
  });

  it('treats a repeated redeem by an existing member as success', async () => {
    const groupId = await createGroup('user_A');
    const code = await generate('user_A', groupId);

    const again = await call('user_A', REDEEM, { input: { code } });

    expect(again.body.errors).toBeUndefined();
    expect(again.body.data.redeemInvitationCode.id).toBe(groupId);
  });

  it('invalidates the old code once the code is regenerated', async () => {
    const groupId = await createGroup('user_A');
    const old = await generate('user_A', groupId);

    const regenerated = await call('user_A', REGENERATE, {
      input: { groupId },
    });
    const fresh = regenerated.body.data.regenerateInvitationCode.code;
    expect(fresh).not.toBe(old);

    const stale = await call('user_B', REDEEM, { input: { code: old } });
    expect(stale.body.errors[0].extensions.code).toBe(
      'InvitationCodeInvalidException',
    );

    const joined = await call('user_B', REDEEM, { input: { code: fresh } });
    expect(joined.body.data.redeemInvitationCode.id).toBe(groupId);
  });

  it('rejects unknown and malformed codes', async () => {
    const unknown = await call('user_B', REDEEM, {
      input: { code: '7KQ2M9XZ' },
    });
    expect(unknown.body.errors[0].extensions.code).toBe(
      'InvitationCodeInvalidException',
    );

    const malformed = await call('user_B', REDEEM, { input: { code: 'abc' } });
    expect(malformed.body.errors[0].extensions.code).toBe(
      'InvitationCodeInvalidException',
    );
  });

  it('denies a non-member generating or regenerating a code', async () => {
    const groupId = await createGroup('user_A');

    const generated = await call('user_X', GENERATE, { input: { groupId } });
    expect(generated.body.errors[0].extensions.code).toBe(
      'GroupInvitationAccessDeniedException',
    );
    const regenerated = await call('user_X', REGENERATE, {
      input: { groupId },
    });
    expect(regenerated.body.errors[0].extensions.code).toBe(
      'GroupInvitationAccessDeniedException',
    );
  });

  it('rejects unauthenticated calls', async () => {
    const res = await call(null, REDEEM, { input: { code: '7KQ2M9XZ' } });

    expect(res.body.errors).toHaveLength(1);
    expect(res.body.data).toBeNull();
  });
});
