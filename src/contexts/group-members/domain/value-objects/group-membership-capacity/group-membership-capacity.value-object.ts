import { NumberValueObject } from '@sisques-labs/nestjs-kit';

/** Member limit of a group in the MVP; changing it is a data change. */
export const DEFAULT_GROUP_MEMBERSHIP_CAPACITY = 2;

export class GroupMembershipCapacityValueObject extends NumberValueObject {
  constructor(value: number) {
    super(value, { min: 1, allowDecimals: false });
  }
}
