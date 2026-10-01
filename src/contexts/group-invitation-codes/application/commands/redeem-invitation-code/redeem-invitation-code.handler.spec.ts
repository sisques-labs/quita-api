import { RedeemInvitationCodeCommand } from '@contexts/group-invitation-codes/application/commands/redeem-invitation-code/redeem-invitation-code.command';
import { RedeemInvitationCodeHandler } from '@contexts/group-invitation-codes/application/commands/redeem-invitation-code/redeem-invitation-code.handler';
import {
  AddMemberResult,
  GroupMembersPort,
} from '@contexts/group-invitation-codes/application/ports/group-members.port';
import { AssertActiveInvitationCodeExistsService } from '@contexts/group-invitation-codes/application/services/read/assert-active-invitation-code-exists.service';
import { GroupInvitationCodeBuilder } from '@contexts/group-invitation-codes/domain/builders/group-invitation-code.builder';
import { InvitationCodeInvalidException } from '@contexts/group-invitation-codes/domain/exceptions/invitation-code-invalid.exception';
import { Mocked } from 'vitest';

const GROUP_ID = '5d1c8f0a-3f55-4b6a-8a27-3a8d3b0d7e22';

describe('RedeemInvitationCodeHandler', () => {
  let assertCode: Mocked<AssertActiveInvitationCodeExistsService>;
  let membersPort: Mocked<GroupMembersPort>;
  let handler: RedeemInvitationCodeHandler;

  beforeEach(() => {
    assertCode = {
      execute: vi
        .fn()
        .mockResolvedValue(
          new GroupInvitationCodeBuilder()
            .withId('0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11')
            .withGroupId(GROUP_ID)
            .withCode('7KQ2M9XZ')
            .withCreatedBy('user_a')
            .buildViewModel(),
        ),
    } as unknown as Mocked<AssertActiveInvitationCodeExistsService>;
    membersPort = {
      isMember: vi.fn(),
      addMember: vi.fn().mockResolvedValue(AddMemberResult.ADDED),
    };
    handler = new RedeemInvitationCodeHandler(assertCode, membersPort);
  });

  it('adds the requester to the code group and returns the group id', async () => {
    const groupId = await handler.execute(
      new RedeemInvitationCodeCommand({
        code: '7kq2m9xz',
        requesterId: 'user_c',
      }),
    );

    expect(groupId).toBe(GROUP_ID);
    expect(assertCode.execute).toHaveBeenCalledWith('7KQ2M9XZ');
    expect(membersPort.addMember).toHaveBeenCalledWith(GROUP_ID, 'user_c');
  });

  it('is idempotent for a user who is already a member', async () => {
    membersPort.addMember.mockResolvedValue(AddMemberResult.ALREADY_MEMBER);

    await expect(
      handler.execute(
        new RedeemInvitationCodeCommand({
          code: '7KQ2M9XZ',
          requesterId: 'user_a',
        }),
      ),
    ).resolves.toBe(GROUP_ID);
  });

  it('serves two different users with the same reusable code', async () => {
    const first = await handler.execute(
      new RedeemInvitationCodeCommand({
        code: '7KQ2M9XZ',
        requesterId: 'user_c',
      }),
    );
    const second = await handler.execute(
      new RedeemInvitationCodeCommand({
        code: '7KQ2M9XZ',
        requesterId: 'user_d',
      }),
    );

    expect(first).toBe(second);
    expect(membersPort.addMember).toHaveBeenCalledTimes(2);
  });

  it('rejects an unknown or revoked code without adding anyone', async () => {
    assertCode.execute.mockRejectedValue(new InvitationCodeInvalidException());

    await expect(
      handler.execute(
        new RedeemInvitationCodeCommand({
          code: 'ABCD2345',
          requesterId: 'user_c',
        }),
      ),
    ).rejects.toThrow(InvitationCodeInvalidException);
    expect(membersPort.addMember).not.toHaveBeenCalled();
  });

  it('propagates the membership failure (e.g. group full)', async () => {
    membersPort.addMember.mockRejectedValue(new Error('group is full'));

    await expect(
      handler.execute(
        new RedeemInvitationCodeCommand({
          code: '7KQ2M9XZ',
          requesterId: 'user_c',
        }),
      ),
    ).rejects.toThrow('group is full');
  });

  it('rejects a malformed code at command construction', () => {
    expect(
      () =>
        new RedeemInvitationCodeCommand({ code: 'bad', requesterId: 'user_c' }),
    ).toThrow(InvitationCodeInvalidException);
  });
});
