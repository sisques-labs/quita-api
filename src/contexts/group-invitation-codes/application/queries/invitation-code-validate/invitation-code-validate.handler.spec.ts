import { InvitationCodeValidateHandler } from '@contexts/group-invitation-codes/application/queries/invitation-code-validate/invitation-code-validate.handler';
import { InvitationCodeValidateQuery } from '@contexts/group-invitation-codes/application/queries/invitation-code-validate/invitation-code-validate.query';
import { AssertActiveInvitationCodeExistsService } from '@contexts/group-invitation-codes/application/services/read/assert-active-invitation-code-exists.service';
import { GroupInvitationCodeBuilder } from '@contexts/group-invitation-codes/domain/builders/group-invitation-code.builder';
import { InvitationCodeInvalidException } from '@contexts/group-invitation-codes/domain/exceptions/invitation-code-invalid.exception';
import { Mocked } from 'vitest';

const GROUP_ID = '5d1c8f0a-3f55-4b6a-8a27-3a8d3b0d7e22';

describe('InvitationCodeValidateHandler', () => {
  let assertCode: Mocked<AssertActiveInvitationCodeExistsService>;
  let handler: InvitationCodeValidateHandler;

  beforeEach(() => {
    assertCode = {
      execute: vi.fn(),
    } as unknown as Mocked<AssertActiveInvitationCodeExistsService>;
    handler = new InvitationCodeValidateHandler(assertCode);
  });

  it('resolves an active code to its group', async () => {
    assertCode.execute.mockResolvedValue(
      new GroupInvitationCodeBuilder()
        .withId('0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11')
        .withGroupId(GROUP_ID)
        .withCode('7KQ2M9XZ')
        .withCreatedBy('user_a')
        .buildViewModel(),
    );

    const result = await handler.execute(
      new InvitationCodeValidateQuery({ code: '7kq2m9xz' }),
    );

    expect(result.groupId).toBe(GROUP_ID);
    expect(assertCode.execute).toHaveBeenCalledWith('7KQ2M9XZ');
  });

  it('reports an unknown or revoked code as invalid', async () => {
    assertCode.execute.mockRejectedValue(new InvitationCodeInvalidException());

    await expect(
      handler.execute(new InvitationCodeValidateQuery({ code: 'ABCD2345' })),
    ).rejects.toThrow(InvitationCodeInvalidException);
  });
});
