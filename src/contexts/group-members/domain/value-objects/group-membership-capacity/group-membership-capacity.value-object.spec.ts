import {
  DEFAULT_GROUP_MEMBERSHIP_CAPACITY,
  GroupMembershipCapacityValueObject,
} from '@contexts/group-members/domain/value-objects/group-membership-capacity/group-membership-capacity.value-object';

describe('GroupMembershipCapacityValueObject', () => {
  it('defaults to 2 members in the MVP', () => {
    expect(DEFAULT_GROUP_MEMBERSHIP_CAPACITY).toBe(2);
  });

  it.each([1, 2, 10])('accepts a capacity of %s', (capacity) => {
    expect(new GroupMembershipCapacityValueObject(capacity).value).toBe(
      capacity,
    );
  });

  it.each([0, -1, 1.5])('rejects a capacity of %s', (capacity) => {
    expect(() => new GroupMembershipCapacityValueObject(capacity)).toThrow();
  });
});
