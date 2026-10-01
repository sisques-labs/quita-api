import { GroupCreatedByValueObject } from '@contexts/groups/domain/value-objects/group-created-by/group-created-by.value-object';

export interface GroupsFindOwnQueryInput {
  requesterId: string;
}

export class GroupsFindOwnQuery {
  readonly requesterId: GroupCreatedByValueObject;

  constructor(input: GroupsFindOwnQueryInput) {
    this.requesterId = new GroupCreatedByValueObject(input.requesterId);
  }
}
