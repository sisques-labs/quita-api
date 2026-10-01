import { UuidValueObject } from '@sisques-labs/nestjs-kit';

export interface DeleteGroupMembershipCommandInput {
  groupId: string;
}

export class DeleteGroupMembershipCommand {
  readonly groupId: UuidValueObject;

  constructor(input: DeleteGroupMembershipCommandInput) {
    this.groupId = new UuidValueObject(input.groupId);
  }
}
