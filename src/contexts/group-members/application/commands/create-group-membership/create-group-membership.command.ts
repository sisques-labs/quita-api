import { GroupMemberUserIdValueObject } from '@contexts/group-members/domain/value-objects/group-member-user-id/group-member-user-id.value-object';
import { UuidValueObject } from '@sisques-labs/nestjs-kit';

export interface CreateGroupMembershipCommandInput {
  groupId: string;
  ownerId: string;
}

export class CreateGroupMembershipCommand {
  readonly groupId: UuidValueObject;
  readonly ownerId: GroupMemberUserIdValueObject;

  constructor(input: CreateGroupMembershipCommandInput) {
    this.groupId = new UuidValueObject(input.groupId);
    this.ownerId = new GroupMemberUserIdValueObject(input.ownerId);
  }
}
