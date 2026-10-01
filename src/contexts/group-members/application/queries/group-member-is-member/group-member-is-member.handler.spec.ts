import { GroupMemberIsMemberHandler } from '@contexts/group-members/application/queries/group-member-is-member/group-member-is-member.handler';
import { GroupMemberIsMemberQuery } from '@contexts/group-members/application/queries/group-member-is-member/group-member-is-member.query';
import { IGroupMembershipReadRepository } from '@contexts/group-members/domain/repositories/read/group-membership-read.repository';
import { Mocked } from 'vitest';

describe('GroupMemberIsMemberHandler', () => {
  let repository: Mocked<IGroupMembershipReadRepository>;
  let handler: GroupMemberIsMemberHandler;

  beforeEach(() => {
    repository = {
      isMember: vi.fn(),
    } as unknown as Mocked<IGroupMembershipReadRepository>;
    handler = new GroupMemberIsMemberHandler(repository);
  });

  it.each([true, false])(
    'answers %s as reported by the repository',
    async (answer) => {
      repository.isMember.mockResolvedValue(answer);

      const result = await handler.execute(
        new GroupMemberIsMemberQuery({
          groupId: '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11',
          userId: 'user_1',
        }),
      );

      expect(result).toBe(answer);
      expect(repository.isMember).toHaveBeenCalledWith(
        '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11',
        'user_1',
      );
    },
  );
});
