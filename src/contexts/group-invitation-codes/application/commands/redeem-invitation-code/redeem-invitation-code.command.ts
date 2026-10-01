import { GroupInvitationCodeCreatedByValueObject } from '@contexts/group-invitation-codes/domain/value-objects/group-invitation-code-created-by/group-invitation-code-created-by.value-object';
import { InvitationCodeValueObject } from '@contexts/group-invitation-codes/domain/value-objects/invitation-code/invitation-code.value-object';

export interface RedeemInvitationCodeCommandInput {
  code: string;
  requesterId: string;
}

export class RedeemInvitationCodeCommand {
  readonly code: InvitationCodeValueObject;
  readonly requesterId: GroupInvitationCodeCreatedByValueObject;

  constructor(input: RedeemInvitationCodeCommandInput) {
    this.code = new InvitationCodeValueObject(input.code);
    this.requesterId = new GroupInvitationCodeCreatedByValueObject(
      input.requesterId,
    );
  }
}
