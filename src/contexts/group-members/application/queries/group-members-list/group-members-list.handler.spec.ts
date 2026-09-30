import { GroupMembersListHandler } from '@contexts/group-members/application/queries/group-members-list/group-members-list.handler';
import { GroupMembersListQuery } from '@contexts/group-members/application/queries/group-members-list/group-members-list.query';
import { AssertGroupMembershipViewModelExistsService } from '@contexts/group-members/application/services/read/assert-group-membership-view-model-exists.service';
import { GroupMembershipBuilder } from '@contexts/group-members/domain/builders/group-membership.builder';
import { GroupMemberRole } from '@contexts/group-members/domain/enums/group-member-role.enum';
import { GroupMemberAccessDeniedException } from '@contexts/group-members/domain/exceptions/group-member-access-denied.exception';
import { Mocked } from 'vitest';

const viewModel = () =>
  new GroupMembershipBuilder()
    .withId('0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11')
    .withMembers([
      { userId: 'A', role: GroupMemberRole.OWNER, joinedAt: new Date() },
      { userId: 'B', role: GroupMemberRole.MEMBER, joinedAt: new Date() },
    ])
    .buildViewModel();

describe('GroupMembersListHandler', () => {
  let assertExists: Mocked<AssertGroupMembershipViewModelExistsService>;
  let handler: GroupMembersListHandler;

  beforeEach(() => {
    assertExists = {
      execute: vi.fn(),
    } as unknown as Mocked<AssertGroupMembershipViewModelExistsService>;
    assertExists.execute.mockResolvedValue(viewModel());
    handler = new GroupMembersListHandler(assertExists);
  });

  it('lists A and B for member A', async () => {
    const result = await handler.execute(
      new GroupMembersListQuery({
        groupId: '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11',
        requesterId: 'A',
      }),
    );

    expect(result.members.map((m) => m.userId)).toEqual(['A', 'B']);
  });

  it('denies a non-member', async () => {
    await expect(
      handler.execute(
        new GroupMembersListQuery({
          groupId: '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11',
          requesterId: 'N',
        }),
      ),
    ).rejects.toThrow(GroupMemberAccessDeniedException);
  });
});
