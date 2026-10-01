import { AssertGroupExistsService } from '@contexts/groups/application/services/write/assert-group-exists/assert-group-exists.service';
import { GroupBuilder } from '@contexts/groups/domain/builders/group.builder';
import { GroupNotFoundException } from '@contexts/groups/domain/exceptions/group-not-found.exception';
import { IGroupWriteRepository } from '@contexts/groups/domain/repositories/write/group-write.repository';
import { UuidValueObject } from '@sisques-labs/nestjs-kit';
import { Mocked } from 'vitest';

const GROUP_ID = '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11';

describe('AssertGroupExistsService', () => {
  let repository: Mocked<IGroupWriteRepository>;
  let service: AssertGroupExistsService;

  beforeEach(() => {
    repository = {
      findById: vi.fn(),
    } as unknown as Mocked<IGroupWriteRepository>;
    service = new AssertGroupExistsService(repository);
  });

  it('returns the stored aggregate', async () => {
    const group = new GroupBuilder()
      .withId(GROUP_ID)
      .withName('Home')
      .withCreatedBy('user_owner')
      .build();
    repository.findById.mockResolvedValue(group);

    await expect(service.execute(new UuidValueObject(GROUP_ID))).resolves.toBe(
      group,
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
