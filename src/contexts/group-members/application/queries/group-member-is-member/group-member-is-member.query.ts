import { GroupMemberUserIdValueObject } from '@contexts/group-members/domain/value-objects/group-member-user-id/group-member-user-id.value-object';
import { UuidValueObject } from '@sisques-labs/nestjs-kit';

export interface GroupMemberIsMemberQueryInput {
  groupId: string;
  userId: string;
}

export class GroupMemberIsMemberQuery {
  readonly groupId: UuidValueObject;
  readonly userId: GroupMemberUserIdValueObject;

  constructor(input: GroupMemberIsMemberQueryInput) {
    this.groupId = new UuidValueObject(input.groupId);
    this.userId = new GroupMemberUserIdValueObject(input.userId);
  }
}
