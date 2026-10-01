import { AssertActiveInvitationCodeExistsService } from '@contexts/group-invitation-codes/application/services/read/assert-active-invitation-code-exists/assert-active-invitation-code-exists.service';
import { GroupInvitationCodeBuilder } from '@contexts/group-invitation-codes/domain/builders/group-invitation-code.builder';
import { InvitationCodeInvalidException } from '@contexts/group-invitation-codes/domain/exceptions/invitation-code-invalid.exception';
import { IGroupInvitationCodeReadRepository } from '@contexts/group-invitation-codes/domain/repositories/read/group-invitation-code-read.repository';
import { InvitationCodeValueObject } from '@contexts/group-invitation-codes/domain/value-objects/invitation-code/invitation-code.value-object';
import { Mocked } from 'vitest';

describe('AssertActiveInvitationCodeExistsService', () => {
  let repository: Mocked<IGroupInvitationCodeReadRepository>;
  let service: AssertActiveInvitationCodeExistsService;

  beforeEach(() => {
    repository = {
      findById: vi.fn(),
      findByCriteria: vi.fn(),
      findActiveByCode: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
    };
    service = new AssertActiveInvitationCodeExistsService(repository);
  });

  it('returns the active code, looked up by its normalized value', async () => {
    const viewModel = new GroupInvitationCodeBuilder()
      .withId('0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11')
      .withGroupId('5d1c8f0a-3f55-4b6a-8a27-3a8d3b0d7e22')
      .withCode('7KQ2M9XZ')
      .withCreatedBy('user_a')
      .buildViewModel();
    repository.findActiveByCode.mockResolvedValue(viewModel);

    await expect(
      service.execute(new InvitationCodeValueObject('7kq2m9xz')),
    ).resolves.toBe(viewModel);
    expect(repository.findActiveByCode).toHaveBeenCalledWith('7KQ2M9XZ');
  });

  it('reports an unknown or revoked code as invalid', async () => {
    repository.findActiveByCode.mockResolvedValue(null);

    await expect(
      service.execute(new InvitationCodeValueObject('7KQ2M9XZ')),
    ).rejects.toThrow(InvitationCodeInvalidException);
  });
});
