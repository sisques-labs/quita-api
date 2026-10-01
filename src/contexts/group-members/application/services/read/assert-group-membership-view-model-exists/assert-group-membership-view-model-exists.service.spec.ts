import { AssertGroupMembershipViewModelExistsService } from '@contexts/group-members/application/services/read/assert-group-membership-view-model-exists/assert-group-membership-view-model-exists.service';
import { GroupMembershipBuilder } from '@contexts/group-members/domain/builders/group-membership.builder';
import { GroupMembershipNotFoundException } from '@contexts/group-members/domain/exceptions/group-membership-not-found.exception';
import { IGroupMembershipReadRepository } from '@contexts/group-members/domain/repositories/read/group-membership-read.repository';
import { UuidValueObject } from '@sisques-labs/nestjs-kit';
import { Mocked } from 'vitest';

describe('AssertGroupMembershipViewModelExistsService', () => {
  let repository: Mocked<IGroupMembershipReadRepository>;
  let service: AssertGroupMembershipViewModelExistsService;

  beforeEach(() => {
    repository = {
      findByGroupId: vi.fn(),
    } as unknown as Mocked<IGroupMembershipReadRepository>;
    service = new AssertGroupMembershipViewModelExistsService(repository);
  });

  it('returns the stored view model', async () => {
    const viewModel = new GroupMembershipBuilder()
      .withId('0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11')
      .buildViewModel();
    repository.findByGroupId.mockResolvedValue(viewModel);

    await expect(
      service.execute(
        new UuidValueObject('0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11'),
      ),
    ).resolves.toBe(viewModel);
  });

  it('throws when the group has no roster', async () => {
    repository.findByGroupId.mockResolvedValue(null);

    await expect(
      service.execute(
        new UuidValueObject('0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11'),
      ),
    ).rejects.toThrow(GroupMembershipNotFoundException);
  });
});
