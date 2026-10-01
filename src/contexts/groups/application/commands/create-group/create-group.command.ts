import { GroupCreatedByValueObject } from '@contexts/groups/domain/value-objects/group-created-by/group-created-by.value-object';
import { GroupNameValueObject } from '@contexts/groups/domain/value-objects/group-name/group-name.value-object';

export interface CreateGroupCommandInput {
  name: string;
  ownerId: string;
}

export class CreateGroupCommand {
  readonly name: GroupNameValueObject;
  readonly ownerId: GroupCreatedByValueObject;

  constructor(input: CreateGroupCommandInput) {
    this.name = new GroupNameValueObject(input.name);
    this.ownerId = new GroupCreatedByValueObject(input.ownerId);
  }
}
