import { StringValueObject, UuidValueObject } from '@sisques-labs/nestjs-kit';

export interface GroupBalanceQueryInput {
  groupId: string;
  requesterId: string;
}

/** `requesterId` comes from the auth guard, never from client input. */
export class GroupBalanceQuery {
  readonly groupId: UuidValueObject;
  readonly requesterId: StringValueObject;

  constructor(input: GroupBalanceQueryInput) {
    this.groupId = new UuidValueObject(input.groupId);
    this.requesterId = new StringValueObject(input.requesterId, {
      minLength: 1,
      maxLength: 64,
      allowEmpty: false,
    });
  }
}
