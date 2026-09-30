import { GroupMembershipConcurrencyException } from '@contexts/group-members/domain/exceptions/group-membership-concurrency.exception';

describe('GroupMembershipConcurrencyException', () => {
  it('names the group whose roster changed concurrently', () => {
    const error = new GroupMembershipConcurrencyException('group-1');

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe(
      'Membership of group group-1 was modified concurrently; retry',
    );
  });
});
