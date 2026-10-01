import { GroupMembershipPort } from '@contexts/groups/application/ports/group-membership.port';
import { AssertRequesterIsGroupMemberService } from '@contexts/groups/application/services/read/assert-requester-is-group-member.service';
import { GroupAccessDeniedException } from '@contexts/groups/domain/exceptions/group-access-denied.exception';
import { Mocked } from 'vitest';

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

    await expect(service.execute('group-1', 'user_1')).resolves.toBeUndefined();
    expect(membershipPort.isMember).toHaveBeenCalledWith('group-1', 'user_1');
  });

  it('denies a requester that is not a member', async () => {
    membershipPort.isMember.mockResolvedValue(false);

    await expect(service.execute('group-1', 'stranger')).rejects.toThrow(
      GroupAccessDeniedException,
    );
  });
});
