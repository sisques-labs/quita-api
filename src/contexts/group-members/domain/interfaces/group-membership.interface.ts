import { GroupMember } from '@contexts/group-members/domain/entities/group-member';
import { GroupMembershipCapacityValueObject } from '@contexts/group-members/domain/value-objects/group-membership-capacity/group-membership-capacity.value-object';
import { IBaseAggregate, NumberValueObject } from '@sisques-labs/nestjs-kit';

export interface IGroupMembership extends IBaseAggregate {
  capacity: GroupMembershipCapacityValueObject;
  version: NumberValueObject;
  members: GroupMember[];
}
