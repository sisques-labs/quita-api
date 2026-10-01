import { UuidValueObject } from '@sisques-labs/nestjs-kit';

export interface DeleteGroupCommandInput {
  groupId: string;
}

/**
 * INTERNAL ONLY. Dispatched solely by the create-group compensation
 * (`CreateGroupHandler`) to roll back a just-created group. It carries no
 * `requesterId` and performs a HARD delete.
 *
 * If it is ever exposed through a resolver it needs: a guard plus a
 * requester/membership check, a soft-delete decision, and cleanup of the
 * group's invitation codes, expenses and payments. Note that invitation-code
 * redeem does not check that the group still exists.
 */
export class DeleteGroupCommand {
  readonly groupId: UuidValueObject;

  constructor(input: DeleteGroupCommandInput) {
    this.groupId = new UuidValueObject(input.groupId);
  }
}
