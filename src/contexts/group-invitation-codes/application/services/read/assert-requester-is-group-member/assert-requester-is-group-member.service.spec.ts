import { GroupMembersPort } from '@contexts/group-invitation-codes/application/ports/group-members.port';
import { AssertRequesterIsGroupMemberService } from '@contexts/group-invitation-codes/application/services/read/assert-requester-is-group-member.service';
import { GroupInvitationAccessDeniedException } from '@contexts/group-invitation-codes/domain/exceptions/group-invitation-access-denied.exception';
import { Mocked } from 'vitest';

describe('AssertRequesterIsGroupMemberService', () => {
  let port: Mocked<GroupMembersPort>;
  let service: AssertRequesterIsGroupMemberService;

  beforeEach(() => {
    port = { isMember: vi.fn(), addMember: vi.fn() };
    service = new AssertRequesterIsGroupMemberService(port);
  });

  it('resolves for a member', async () => {
    port.isMember.mockResolvedValue(true);

    await expect(service.execute('group-1', 'user_a')).resolves.toBeUndefined();
    expect(port.isMember).toHaveBeenCalledWith('group-1', 'user_a');
  });

  it('denies a non-member', async () => {
    port.isMember.mockResolvedValue(false);

    await expect(service.execute('group-1', 'stranger')).rejects.toThrow(
      GroupInvitationAccessDeniedException,
    );
  });
});
