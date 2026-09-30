import { UuidValueObject } from '@sisques-labs/nestjs-kit';

export interface DeleteGroupCommandInput {
  groupId: string;
}

export class DeleteGroupCommand {
  readonly groupId: UuidValueObject;

  constructor(input: DeleteGroupCommandInput) {
    this.groupId = new UuidValueObject(input.groupId);
  }
}
