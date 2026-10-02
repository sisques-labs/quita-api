import { GroupFindByIdHandler } from '@contexts/groups/application/queries/group-find-by-id/group-find-by-id.handler';
import { GroupFindByIdQuery } from '@contexts/groups/application/queries/group-find-by-id/group-find-by-id.query';
import { AssertGroupViewModelExistsService } from '@contexts/groups/application/services/read/assert-group-view-model-exists/assert-group-view-model-exists.service';
import { AssertRequesterIsGroupMemberService } from '@contexts/groups/application/services/read/assert-requester-is-group-member/assert-requester-is-group-member.service';
import { GroupBuilder } from '@contexts/groups/domain/builders/group.builder';
import { GroupAccessDeniedException } from '@contexts/groups/domain/exceptions/group-access-denied.exception';
import { GroupNotFoundException } from '@contexts/groups/domain/exceptions/group-not-found.exception';
import { Mocked } from 'vitest';

const GROUP_ID = '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11';

describe('GroupFindByIdHandler', () => {
  let assertMember: Mocked<AssertRequesterIsGroupMemberService>;
  let assertExists: Mocked<AssertGroupViewModelExistsService>;
  let handler: GroupFindByIdHandler;

  beforeEach(() => {
    assertMember = {
      execute: vi.fn(),
    } as unknown as Mocked<AssertRequesterIsGroupMemberService>;
    assertExists = {
      execute: vi.fn(),
    } as unknown as Mocked<AssertGroupViewModelExistsService>;
    handler = new GroupFindByIdHandler(assertMember, assertExists);
  });

  it('returns the group to a member', async () => {
    const viewModel = new GroupBuilder()
      .withId(GROUP_ID)
      .withName('Home')
      .withCreatedBy('user_owner')
      .buildViewModel();
    assertExists.execute.mockResolvedValue(viewModel);

    const result = await handler.execute(
      new GroupFindByIdQuery({ groupId: GROUP_ID, requesterId: 'user_owner' }),
    );

    expect(result).toBe(viewModel);
    expect(assertMember.execute).toHaveBeenCalledWith(
      expect.objectContaining({ value: GROUP_ID }),
      expect.objectContaining({ value: 'user_owner' }),
    );
  });

  it('denies a non-member without loading the group', async () => {
    assertMember.execute.mockRejectedValue(
      new GroupAccessDeniedException('stranger', GROUP_ID),
    );

    await expect(
      handler.execute(
        new GroupFindByIdQuery({ groupId: GROUP_ID, requesterId: 'stranger' }),
      ),
    ).rejects.toThrow(GroupAccessDeniedException);
    expect(assertExists.execute).not.toHaveBeenCalled();
  });

  it('reports a missing group to a member', async () => {
    assertExists.execute.mockRejectedValue(
      new GroupNotFoundException(GROUP_ID),
    );

    await expect(
      handler.execute(
        new GroupFindByIdQuery({ groupId: GROUP_ID, requesterId: 'user_1' }),
      ),
    ).rejects.toThrow(GroupNotFoundException);
  });
});
