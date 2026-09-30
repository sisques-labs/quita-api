import { StringValueObject } from '@sisques-labs/nestjs-kit';

/** Opaque identity-provider subject (the Clerk `sub`) of the member who generated the code. */
export class GroupInvitationCodeCreatedByValueObject extends StringValueObject {
  constructor(value: string) {
    super(value, { minLength: 1, maxLength: 64, allowEmpty: false });
  }
}
