import { GroupMemberRole } from '@contexts/group-members/domain/enums/group-member-role.enum';
import { GroupMemberRoleValueObject } from '@contexts/group-members/domain/value-objects/group-member-role/group-member-role.value-object';

describe('GroupMemberRoleValueObject', () => {
  it.each([GroupMemberRole.OWNER, GroupMemberRole.MEMBER])(
    'accepts the %s role',
    (role) => {
      expect(new GroupMemberRoleValueObject(role).value).toBe(role);
    },
  );

  it('rejects an unknown role', () => {
    expect(() => new GroupMemberRoleValueObject('ADMIN')).toThrow();
  });

  it('tells owners from members', () => {
    expect(
      new GroupMemberRoleValueObject(GroupMemberRole.OWNER).is(
        GroupMemberRole.OWNER,
      ),
    ).toBe(true);
    expect(
      new GroupMemberRoleValueObject(GroupMemberRole.MEMBER).is(
        GroupMemberRole.OWNER,
      ),
    ).toBe(false);
  });
});
