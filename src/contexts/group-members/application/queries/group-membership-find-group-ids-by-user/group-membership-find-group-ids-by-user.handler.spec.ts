import { GroupMembershipFindGroupIdsByUserHandler } from '@contexts/group-members/application/queries/group-membership-find-group-ids-by-user/group-membership-find-group-ids-by-user.handler';
import { GroupMembershipFindGroupIdsByUserQuery } from '@contexts/group-members/application/queries/group-membership-find-group-ids-by-user/group-membership-find-group-ids-by-user.query';
import { IGroupMembershipReadRepository } from '@contexts/group-members/domain/repositories/read/group-membership-read.repository';
import { Mocked } from 'vitest';

describe('GroupMembershipFindGroupIdsByUserHandler', () => {
  let repository: Mocked<IGroupMembershipReadRepository>;
  let handler: GroupMembershipFindGroupIdsByUserHandler;

  beforeEach(() => {
    repository = {
      findGroupIdsByUserId: vi.fn(),
    } as unknown as Mocked<IGroupMembershipReadRepository>;
    handler = new GroupMembershipFindGroupIdsByUserHandler(repository);
  });

  it('returns the ids of the groups the user belongs to', async () => {
    repository.findGroupIdsByUserId.mockResolvedValue(['g1', 'g2']);

    const result = await handler.execute(
      new GroupMembershipFindGroupIdsByUserQuery({ userId: 'user_1' }),
    );

    expect(result).toEqual(['g1', 'g2']);
    expect(repository.findGroupIdsByUserId).toHaveBeenCalledWith('user_1');
  });

  it('returns an empty list for a user with no groups', async () => {
    repository.findGroupIdsByUserId.mockResolvedValue([]);

    await expect(
      handler.execute(
        new GroupMembershipFindGroupIdsByUserQuery({ userId: 'loner' }),
      ),
    ).resolves.toEqual([]);
  });
});
