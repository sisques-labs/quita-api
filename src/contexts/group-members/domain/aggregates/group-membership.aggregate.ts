import { GroupMember } from '@contexts/group-members/domain/entities/group-member';
import { GroupMemberAddedEvent } from '@contexts/group-members/domain/events/group-member-added/group-member-added.event';
import { GroupMembershipCreatedEvent } from '@contexts/group-members/domain/events/group-membership-created/group-membership-created.event';
import { GroupMemberAlreadyExistsException } from '@contexts/group-members/domain/exceptions/group-member-already-exists.exception';
import { GroupMembershipFullException } from '@contexts/group-members/domain/exceptions/group-membership-full.exception';
import { IGroupMembership } from '@contexts/group-members/domain/interfaces/group-membership.interface';
import { IGroupMembershipPrimitives } from '@contexts/group-members/domain/primitives/group-membership.primitives';
import { GroupMembershipCapacityValueObject } from '@contexts/group-members/domain/value-objects/group-membership-capacity/group-membership-capacity.value-object';
import { BaseAggregate, NumberValueObject } from '@sisques-labs/nestjs-kit';

/**
 * Roster of one group (its id is the group id). The member limit is an
 * invariant of this aggregate; `version` backs the optimistic lock that keeps
 * it true under concurrent joins.
 */
export class GroupMembershipAggregate extends BaseAggregate {
  private readonly _capacity: GroupMembershipCapacityValueObject;
  private readonly _version: NumberValueObject;
  private readonly _members: GroupMember[];

  constructor(props: IGroupMembership) {
    super(props.id, props.createdAt, props.updatedAt);
    this._capacity = props.capacity;
    this._version = props.version;
    this._members = [...props.members];
  }

  create(): void {
    this.apply(
      new GroupMembershipCreatedEvent(
        this.generateEventMetadata(GroupMembershipCreatedEvent),
        this.toPrimitives(),
      ),
    );
  }

  addMember(member: GroupMember): void {
    if (this.isMember(member.userId.value)) {
      throw new GroupMemberAlreadyExistsException(
        member.userId.value,
        this.id.value,
      );
    }
    if (this._members.length >= this._capacity.value) {
      throw new GroupMembershipFullException(
        this.id.value,
        this._capacity.value,
      );
    }

    this._members.push(member);
    this.touch();
    this.apply(
      new GroupMemberAddedEvent(
        this.generateEventMetadata(GroupMemberAddedEvent),
        this.toPrimitives(),
      ),
    );
  }

  isMember(userId: string): boolean {
    return this._members.some((member) => member.userId.value === userId);
  }

  get version(): NumberValueObject {
    return this._version;
  }

  toPrimitives(): IGroupMembershipPrimitives {
    return {
      id: this.id.value,
      capacity: this._capacity.value,
      version: this._version.value,
      members: this._members.map((member) => member.toPrimitives()),
      createdAt: this.createdAt.value,
      updatedAt: this.updatedAt.value,
    };
  }
}
