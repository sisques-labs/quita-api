import { GroupMembersFindByGroupIdHandler } from '@contexts/group-members/application/queries/group-members-find-by-group-id/group-members-find-by-group-id.handler';
import { GroupMembersFindByGroupIdQuery } from '@contexts/group-members/application/queries/group-members-find-by-group-id/group-members-find-by-group-id.query';
import { AssertGroupMembershipViewModelExistsService } from '@contexts/group-members/application/services/read/assert-group-membership-view-model-exists.service';
import { GroupMembershipBuilder } from '@contexts/group-members/domain/builders/group-membership.builder';
import { GroupMemberRole } from '@contexts/group-members/domain/enums/group-member-role.enum';
import { GroupMembershipNotFoundException } from '@contexts/group-members/domain/exceptions/group-membership-not-found.exception';
import { Mocked } from 'vitest';

describe('GroupMembersFindByGroupIdHandler', () => {
  let assertExists: Mocked<AssertGroupMembershipViewModelExistsService>;
  let handler: GroupMembersFindByGroupIdHandler;

  beforeEach(() => {
    assertExists = {
      execute: vi.fn(),
    } as unknown as Mocked<AssertGroupMembershipViewModelExistsService>;
    handler = new GroupMembersFindByGroupIdHandler(assertExists);
  });

  it('returns the roster view model of the group', async () => {
    const viewModel = new GroupMembershipBuilder()
      .withId('0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11')
      .withMembers([
        { userId: 'A', role: GroupMemberRole.OWNER, joinedAt: new Date() },
        { userId: 'B', role: GroupMemberRole.MEMBER, joinedAt: new Date() },
      ])
      .buildViewModel();
    assertExists.execute.mockResolvedValue(viewModel);

    const result = await handler.execute(
      new GroupMembersFindByGroupIdQuery({
        groupId: '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11',
      }),
    );

    expect(result.members.map((m) => m.userId)).toEqual(['A', 'B']);
    expect(assertExists.execute).toHaveBeenCalledWith(
      '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11',
    );
  });

  it('propagates a missing roster', async () => {
    assertExists.execute.mockRejectedValue(
      new GroupMembershipNotFoundException(
        '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11',
      ),
    );

    await expect(
      handler.execute(
        new GroupMembersFindByGroupIdQuery({
          groupId: '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11',
        }),
      ),
    ).rejects.toThrow(GroupMembershipNotFoundException);
  });
});
