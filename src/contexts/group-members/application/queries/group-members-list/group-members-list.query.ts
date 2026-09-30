import { GroupMemberUserIdValueObject } from '@contexts/group-members/domain/value-objects/group-member-user-id/group-member-user-id.value-object';
import { UuidValueObject } from '@sisques-labs/nestjs-kit';

export interface GroupMembersListQueryInput {
  groupId: string;
  requesterId: string;
}

export class GroupMembersListQuery {
  readonly groupId: UuidValueObject;
  readonly requesterId: GroupMemberUserIdValueObject;

  constructor(input: GroupMembersListQueryInput) {
    this.groupId = new UuidValueObject(input.groupId);
    this.requesterId = new GroupMemberUserIdValueObject(input.requesterId);
  }
}
