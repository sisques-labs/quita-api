import { AssertGroupViewModelExistsService } from '@contexts/groups/application/services/read/assert-group-view-model-exists/assert-group-view-model-exists.service';
import { GroupBuilder } from '@contexts/groups/domain/builders/group.builder';
import { GroupNotFoundException } from '@contexts/groups/domain/exceptions/group-not-found.exception';
import { GroupReadRepository } from '@contexts/groups/domain/repositories/read/group-read.repository';
import { UuidValueObject } from '@sisques-labs/nestjs-kit';
import { Mocked } from 'vitest';

const GROUP_ID = '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11';

describe('AssertGroupViewModelExistsService', () => {
  let repository: Mocked<GroupReadRepository>;
  let service: AssertGroupViewModelExistsService;

  beforeEach(() => {
    repository = {
      findById: vi.fn(),
    } as unknown as Mocked<GroupReadRepository>;
    service = new AssertGroupViewModelExistsService(repository);
  });

  it('returns the stored view model', async () => {
    const viewModel = new GroupBuilder()
      .withId(GROUP_ID)
      .withName('Home')
      .withCreatedBy('user_owner')
      .buildViewModel();
    repository.findById.mockResolvedValue(viewModel);

    await expect(service.execute(new UuidValueObject(GROUP_ID))).resolves.toBe(
      viewModel,
    );
    expect(repository.findById).toHaveBeenCalledWith(GROUP_ID);
  });

  it('throws when the group does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(
      service.execute(new UuidValueObject(GROUP_ID)),
    ).rejects.toThrow(GroupNotFoundException);
  });
});
