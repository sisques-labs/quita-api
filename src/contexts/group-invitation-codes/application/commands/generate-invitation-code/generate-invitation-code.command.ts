import { GroupInvitationCodeCreatedByValueObject } from '@contexts/group-invitation-codes/domain/value-objects/group-invitation-code-created-by/group-invitation-code-created-by.value-object';
import { UuidValueObject } from '@sisques-labs/nestjs-kit';

export interface GenerateInvitationCodeCommandInput {
  groupId: string;
  requesterId: string;
}

export class GenerateInvitationCodeCommand {
  readonly groupId: UuidValueObject;
  readonly requesterId: GroupInvitationCodeCreatedByValueObject;

  constructor(input: GenerateInvitationCodeCommandInput) {
    this.groupId = new UuidValueObject(input.groupId);
    this.requesterId = new GroupInvitationCodeCreatedByValueObject(
      input.requesterId,
    );
  }
}
