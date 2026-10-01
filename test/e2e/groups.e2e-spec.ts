import { createE2EApp, E2EContext } from '../helpers/app-bootstrap';
import { truncateAll } from '../helpers/db-reset';

const CREATE_GROUP = `
  mutation CreateGroup($input: GroupCreateRequestDto!) {
    createGroup(input: $input) { success message id }
  }
`;
const GROUP = `query Group($id: ID!) { group(id: $id) { id name createdBy } }`;
const GROUPS = `{ groups { id name } }`;
const GROUP_MEMBERS = `query M($id: ID!) { groupMembers(groupId: $id) { userId role } }`;

describe('Groups (e2e)', () => {
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

  const createGroup = async (sub: string, name: string): Promise<string> => {
    const res = await call(sub, CREATE_GROUP, { input: { name } });
    expect(res.body.errors).toBeUndefined();
    return res.body.data.createGroup.id;
  };

  it('creates a group and makes the creator its owner member', async () => {
    const id = await createGroup('user_A', 'Home');

    const group = await call('user_A', GROUP, { id });
    expect(group.body.data.group).toEqual({
      id,
      name: 'Home',
      createdBy: 'user_A',
    });

    const members = await call('user_A', GROUP_MEMBERS, { id });
    expect(members.body.data.groupMembers).toEqual([
      { userId: 'user_A', role: 'OWNER' },
    ]);
  });

  it('rejects a request without a name and a blank name', async () => {
    const missing = await call('user_A', CREATE_GROUP, { input: {} });
    expect(missing.body.errors).toHaveLength(1);

    const blank = await call('user_A', CREATE_GROUP, {
      input: { name: '   ' },
    });
    expect(blank.body.errors).toHaveLength(1);
    expect(blank.body.data).toBeNull();

    const listed = await call('user_A', GROUPS);
    expect(listed.body.data.groups).toEqual([]);
  });

  it('denies reading a group to a non-member', async () => {
    const id = await createGroup('user_A', 'Home');

    const res = await call('user_B', GROUP, { id });

    expect(res.body.errors[0].extensions.code).toBe(
      'GroupAccessDeniedException',
    );
  });

  it('lists only the groups the caller belongs to', async () => {
    const home = await createGroup('user_A', 'Home');
    await createGroup('user_B', 'Other');

    const res = await call('user_A', GROUPS);

    expect(res.body.data.groups).toEqual([{ id: home, name: 'Home' }]);
  });

  it('rejects unauthenticated calls', async () => {
    const res = await call(null, GROUPS);

    expect(res.body.errors).toHaveLength(1);
    expect(res.body.data).toBeNull();
  });
});
