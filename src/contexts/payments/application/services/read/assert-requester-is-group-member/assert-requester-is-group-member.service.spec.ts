import { GroupMembersPort } from '@contexts/payments/application/ports/group-members.port';
import { AssertRequesterIsGroupMemberService } from '@contexts/payments/application/services/read/assert-requester-is-group-member/assert-requester-is-group-member.service';
import { PaymentAccessDeniedException } from '@contexts/payments/domain/exceptions/payment-access-denied.exception';
import { StringValueObject, UuidValueObject } from '@sisques-labs/nestjs-kit';
import { Mocked } from 'vitest';

const GROUP_ID = '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11';

describe('AssertRequesterIsGroupMemberService', () => {
  let port: Mocked<GroupMembersPort>;
  let service: AssertRequesterIsGroupMemberService;

  beforeEach(() => {
    port = { isMember: vi.fn() };
    service = new AssertRequesterIsGroupMemberService(port);
  });

  it('resolves for a member', async () => {
    port.isMember.mockResolvedValue(true);

    await expect(
      service.execute(
        new UuidValueObject(GROUP_ID),
        new StringValueObject('user_a'),
      ),
    ).resolves.toBeUndefined();
    expect(port.isMember).toHaveBeenCalledWith(GROUP_ID, 'user_a');
  });

  it('denies a non-member', async () => {
    port.isMember.mockResolvedValue(false);

    await expect(
      service.execute(
        new UuidValueObject(GROUP_ID),
        new StringValueObject('stranger'),
      ),
    ).rejects.toThrow(PaymentAccessDeniedException);
  });
});
