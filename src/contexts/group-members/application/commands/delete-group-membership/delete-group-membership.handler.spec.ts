import { DeleteGroupMembershipCommand } from '@contexts/group-members/application/commands/delete-group-membership/delete-group-membership.command';
import { DeleteGroupMembershipHandler } from '@contexts/group-members/application/commands/delete-group-membership/delete-group-membership.handler';
import { GroupMembershipWriteRepository } from '@contexts/group-members/domain/repositories/write/group-membership-write.repository';
import { Mocked } from 'vitest';

const GROUP_ID = '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11';

describe('DeleteGroupMembershipHandler', () => {
  let repository: Mocked<GroupMembershipWriteRepository>;
  let handler: DeleteGroupMembershipHandler;

  beforeEach(() => {
    repository = {
      delete: vi.fn().mockResolvedValue(undefined),
    } as unknown as Mocked<GroupMembershipWriteRepository>;
    handler = new DeleteGroupMembershipHandler(repository);
  });

  it('deletes the roster of the group', async () => {
    await expect(
      handler.execute(new DeleteGroupMembershipCommand({ groupId: GROUP_ID })),
    ).resolves.toBeUndefined();

    expect(repository.delete).toHaveBeenCalledTimes(1);
    expect(repository.delete).toHaveBeenCalledWith(GROUP_ID);
  });

  it('does not require an existing roster (idempotent compensation)', async () => {
    // No lookup is available on the mock: the handler must not need one.
    await expect(
      handler.execute(new DeleteGroupMembershipCommand({ groupId: GROUP_ID })),
    ).resolves.toBeUndefined();
    await expect(
      handler.execute(new DeleteGroupMembershipCommand({ groupId: GROUP_ID })),
    ).resolves.toBeUndefined();

    expect(repository.delete).toHaveBeenCalledTimes(2);
  });

  it('propagates a repository failure', async () => {
    repository.delete.mockRejectedValue(new Error('db down'));

    await expect(
      handler.execute(new DeleteGroupMembershipCommand({ groupId: GROUP_ID })),
    ).rejects.toThrow('db down');
  });

  it('rejects an invalid group id at command construction', () => {
    expect(
      () => new DeleteGroupMembershipCommand({ groupId: 'not-a-uuid' }),
    ).toThrow();
  });
});
