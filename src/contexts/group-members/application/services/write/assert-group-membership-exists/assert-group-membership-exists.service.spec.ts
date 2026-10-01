import { AssertGroupMembershipExistsService } from '@contexts/group-members/application/services/write/assert-group-membership-exists.service';
import { GroupMembershipBuilder } from '@contexts/group-members/domain/builders/group-membership.builder';
import { GroupMembershipNotFoundException } from '@contexts/group-members/domain/exceptions/group-membership-not-found.exception';
import { GroupMembershipWriteRepository } from '@contexts/group-members/domain/repositories/write/group-membership-write.repository';
import { Mocked } from 'vitest';

describe('AssertGroupMembershipExistsService', () => {
  let repository: Mocked<GroupMembershipWriteRepository>;
  let service: AssertGroupMembershipExistsService;

  beforeEach(() => {
    repository = {
      findById: vi.fn(),
    } as unknown as Mocked<GroupMembershipWriteRepository>;
    service = new AssertGroupMembershipExistsService(repository);
  });

  it('returns the stored aggregate', async () => {
    const aggregate = new GroupMembershipBuilder()
      .withId('0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11')
      .build();
    repository.findById.mockResolvedValue(aggregate);

    await expect(
      service.execute('0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11'),
    ).resolves.toBe(aggregate);
    expect(repository.findById).toHaveBeenCalledWith(
      '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11',
    );
  });

  it('throws when the group has no roster', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(
      service.execute('0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11'),
    ).rejects.toThrow(GroupMembershipNotFoundException);
  });
});
