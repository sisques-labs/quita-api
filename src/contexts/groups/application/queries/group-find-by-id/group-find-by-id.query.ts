import { GroupCreatedByValueObject } from '@contexts/groups/domain/value-objects/group-created-by/group-created-by.value-object';
import { UuidValueObject } from '@sisques-labs/nestjs-kit';

export interface GroupFindByIdQueryInput {
  groupId: string;
  requesterId: string;
}

export class GroupFindByIdQuery {
  readonly groupId: UuidValueObject;
  readonly requesterId: GroupCreatedByValueObject;

  constructor(input: GroupFindByIdQueryInput) {
    this.groupId = new UuidValueObject(input.groupId);
    this.requesterId = new GroupCreatedByValueObject(input.requesterId);
  }
}
