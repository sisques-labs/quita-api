import { GroupMemberUserIdValueObject } from '@contexts/group-members/domain/value-objects/group-member-user-id/group-member-user-id.value-object';

export interface GroupMembershipFindGroupIdsByUserQueryInput {
  userId: string;
}

export class GroupMembershipFindGroupIdsByUserQuery {
  readonly userId: GroupMemberUserIdValueObject;

  constructor(input: GroupMembershipFindGroupIdsByUserQueryInput) {
    this.userId = new GroupMemberUserIdValueObject(input.userId);
  }
}
