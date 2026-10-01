import { GroupMembershipPort } from '@contexts/groups/application/ports/group-membership.port';
import { AssertRequesterIsGroupMemberService } from '@contexts/groups/application/services/read/assert-requester-is-group-member/assert-requester-is-group-member.service';
import { GroupAccessDeniedException } from '@contexts/groups/domain/exceptions/group-access-denied.exception';
import { StringValueObject, UuidValueObject } from '@sisques-labs/nestjs-kit';
import { Mocked } from 'vitest';

const GROUP_ID = '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11';

describe('AssertRequesterIsGroupMemberService', () => {
  let membershipPort: Mocked<GroupMembershipPort>;
  let service: AssertRequesterIsGroupMemberService;

  beforeEach(() => {
    membershipPort = {
      isMember: vi.fn(),
    } as unknown as Mocked<GroupMembershipPort>;
    service = new AssertRequesterIsGroupMemberService(membershipPort);
  });

  it('resolves when the requester is a member', async () => {
    membershipPort.isMember.mockResolvedValue(true);

    await expect(
      service.execute(
        new UuidValueObject(GROUP_ID),
        new StringValueObject('user_1'),
      ),
    ).resolves.toBeUndefined();
    expect(membershipPort.isMember).toHaveBeenCalledWith(GROUP_ID, 'user_1');
  });

  it('denies a requester that is not a member', async () => {
    membershipPort.isMember.mockResolvedValue(false);

    await expect(
      service.execute(
        new UuidValueObject(GROUP_ID),
        new StringValueObject('stranger'),
      ),
    ).rejects.toThrow(GroupAccessDeniedException);
  });
});
