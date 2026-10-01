import { UuidValueObject } from '@sisques-labs/nestjs-kit';

export interface GroupMembersFindByGroupIdQueryInput {
  groupId: string;
}

export class GroupMembersFindByGroupIdQuery {
  readonly groupId: UuidValueObject;

  constructor(input: GroupMembersFindByGroupIdQueryInput) {
    this.groupId = new UuidValueObject(input.groupId);
  }
}
