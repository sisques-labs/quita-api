import { GroupMemberUserIdValueObject } from '@contexts/group-members/domain/value-objects/group-member-user-id/group-member-user-id.value-object';

describe('GroupMemberUserIdValueObject', () => {
  it('accepts an opaque identity provider subject', () => {
    expect(new GroupMemberUserIdValueObject('user_2abc').value).toBe(
      'user_2abc',
    );
  });

  it('rejects an empty id', () => {
    expect(() => new GroupMemberUserIdValueObject('')).toThrow();
  });

  it('rejects an id longer than 64 characters', () => {
    expect(() => new GroupMemberUserIdValueObject('u'.repeat(65))).toThrow();
    expect(new GroupMemberUserIdValueObject('u'.repeat(64)).value).toHaveLength(
      64,
    );
  });
});
