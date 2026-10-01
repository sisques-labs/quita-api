import { GroupMembershipAggregate } from '@contexts/group-members/domain/aggregates/group-membership.aggregate';
import { DEFAULT_GROUP_MEMBERSHIP_CAPACITY } from '@contexts/group-members/domain/constants/default-group-membership-capacity.constant';
import { GroupMember } from '@contexts/group-members/domain/entities/group-member';
import { GroupMemberPrimitives } from '@contexts/group-members/domain/primitives/group-member.primitives';
import { GroupMembershipCapacityValueObject } from '@contexts/group-members/domain/value-objects/group-membership-capacity/group-membership-capacity.value-object';
import { GroupMembershipViewModel } from '@contexts/group-members/domain/view-models/group-membership.view-model';
import {
  BaseBuilder,
  DateValueObject,
  NumberValueObject,
  UuidValueObject,
} from '@sisques-labs/nestjs-kit';

/** `withId` takes the group id. Version 0 means "not persisted yet". */
export class GroupMembershipBuilder extends BaseBuilder<
  GroupMembershipAggregate,
  GroupMembershipViewModel
> {
  private _capacity = DEFAULT_GROUP_MEMBERSHIP_CAPACITY;
  private _version = 0;
  private _members: GroupMemberPrimitives[] = [];

  withCapacity(capacity: number): this {
    this._capacity = capacity;
    return this;
  }

  withVersion(version: number): this {
    this._version = version;
    return this;
  }

  withMembers(members: GroupMemberPrimitives[]): this {
    this._members = members;
    return this;
  }

  build(): GroupMembershipAggregate {
    this.validateWithDefaults();

    return new GroupMembershipAggregate({
      id: new UuidValueObject(this._id),
      createdAt: new DateValueObject(this._createdAt),
      updatedAt: new DateValueObject(this._updatedAt),
      capacity: new GroupMembershipCapacityValueObject(this._capacity),
      version: new NumberValueObject(this._version, { min: 0 }),
      members: this._members.map((member) =>
        GroupMember.fromPrimitives(member),
      ),
    });
  }

  buildViewModel(): GroupMembershipViewModel {
    this.validateWithDefaults();

    return new GroupMembershipViewModel(
      this._id,
      this._createdAt,
      this._updatedAt,
      this._capacity,
      this._members,
    );
  }

  private validateWithDefaults(): void {
    this._createdAt ??= new Date();
    this._updatedAt ??= this._createdAt;
    this.validate();
  }
}
