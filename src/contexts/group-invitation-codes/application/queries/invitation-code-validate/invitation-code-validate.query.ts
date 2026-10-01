import { InvitationCodeValueObject } from '@contexts/group-invitation-codes/domain/value-objects/invitation-code/invitation-code.value-object';

export interface InvitationCodeValidateQueryInput {
  code: string;
}

export class InvitationCodeValidateQuery {
  readonly code: InvitationCodeValueObject;

  constructor(input: InvitationCodeValidateQueryInput) {
    this.code = new InvitationCodeValueObject(input.code);
  }
}
