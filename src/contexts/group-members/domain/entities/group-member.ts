import { GroupMemberPrimitives } from '@contexts/group-members/domain/primitives/group-member.primitives';
import { GroupMemberRoleValueObject } from '@contexts/group-members/domain/value-objects/group-member-role/group-member-role.value-object';
import { GroupMemberUserIdValueObject } from '@contexts/group-members/domain/value-objects/group-member-user-id/group-member-user-id.value-object';
import { DateValueObject } from '@sisques-labs/nestjs-kit';

/** A roster line; it only exists inside a `GroupMembershipAggregate`. */
export class GroupMember {
  constructor(
    readonly userId: GroupMemberUserIdValueObject,
    readonly role: GroupMemberRoleValueObject,
    readonly joinedAt: DateValueObject,
  ) {}

  static fromPrimitives(primitives: GroupMemberPrimitives): GroupMember {
    return new GroupMember(
      new GroupMemberUserIdValueObject(primitives.userId),
      new GroupMemberRoleValueObject(primitives.role),
      new DateValueObject(primitives.joinedAt),
    );
  }

  toPrimitives(): GroupMemberPrimitives {
    return {
      userId: this.userId.value,
      role: this.role.value,
      joinedAt: this.joinedAt.value,
    };
  }
}
