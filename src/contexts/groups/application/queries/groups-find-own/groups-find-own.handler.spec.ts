import { GroupMembershipPort } from '@contexts/groups/application/ports/group-membership.port';
import { GroupsFindOwnHandler } from '@contexts/groups/application/queries/groups-find-own/groups-find-own.handler';
import { GroupsFindOwnQuery } from '@contexts/groups/application/queries/groups-find-own/groups-find-own.query';
import { GroupBuilder } from '@contexts/groups/domain/builders/group.builder';
import { IGroupReadRepository } from '@contexts/groups/domain/repositories/read/group-read.repository';
import { Mocked } from 'vitest';

const G1 = '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11';

describe('GroupsFindOwnHandler', () => {
  let membershipPort: Mocked<GroupMembershipPort>;
  let repository: Mocked<IGroupReadRepository>;
  let handler: GroupsFindOwnHandler;

  beforeEach(() => {
    membershipPort = {
      listGroupIdsForUser: vi.fn(),
    } as unknown as Mocked<GroupMembershipPort>;
    repository = {
      findByIds: vi.fn(),
    } as unknown as Mocked<IGroupReadRepository>;
    handler = new GroupsFindOwnHandler(membershipPort, repository);
  });

  it('returns only the groups the user belongs to', async () => {
    const g1 = new GroupBuilder()
      .withId(G1)
      .withName('Home')
      .withCreatedBy('user_1')
      .buildViewModel();
    membershipPort.listGroupIdsForUser.mockResolvedValue([G1]);
    repository.findByIds.mockResolvedValue([g1]);

    const result = await handler.execute(
      new GroupsFindOwnQuery({ requesterId: 'user_1' }),
    );

    expect(result).toEqual([g1]);
    expect(membershipPort.listGroupIdsForUser).toHaveBeenCalledWith('user_1');
    expect(repository.findByIds).toHaveBeenCalledWith([G1]);
  });

  it('returns an empty list without querying groups when the user has none', async () => {
    membershipPort.listGroupIdsForUser.mockResolvedValue([]);

    await expect(
      handler.execute(new GroupsFindOwnQuery({ requesterId: 'loner' })),
    ).resolves.toEqual([]);
    expect(repository.findByIds).not.toHaveBeenCalled();
  });
});
