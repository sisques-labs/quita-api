import { AssertGroupMembershipNotExistsService } from '@contexts/group-members/application/services/write/assert-group-membership-not-exists/assert-group-membership-not-exists.service';
import { GroupMembershipBuilder } from '@contexts/group-members/domain/builders/group-membership.builder';
import { GroupMembershipAlreadyExistsException } from '@contexts/group-members/domain/exceptions/group-membership-already-exists.exception';
import { GroupMembershipWriteRepository } from '@contexts/group-members/domain/repositories/write/group-membership-write.repository';
import { UuidValueObject } from '@sisques-labs/nestjs-kit';
import { Mocked } from 'vitest';

describe('AssertGroupMembershipNotExistsService', () => {
  let repository: Mocked<GroupMembershipWriteRepository>;
  let service: AssertGroupMembershipNotExistsService;

  beforeEach(() => {
    repository = {
      findById: vi.fn(),
    } as unknown as Mocked<GroupMembershipWriteRepository>;
    service = new AssertGroupMembershipNotExistsService(repository);
  });

  it('passes when there is no roster yet', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(
      service.execute(
        new UuidValueObject('0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11'),
      ),
    ).resolves.toBeUndefined();
  });

  it('throws when the roster already exists', async () => {
    repository.findById.mockResolvedValue(
      new GroupMembershipBuilder()
        .withId('0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11')
        .build(),
    );

    await expect(
      service.execute(
        new UuidValueObject('0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11'),
      ),
    ).rejects.toThrow(GroupMembershipAlreadyExistsException);
  });
});
