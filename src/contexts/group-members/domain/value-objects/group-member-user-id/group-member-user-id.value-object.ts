import { StringValueObject } from '@sisques-labs/nestjs-kit';

/** Opaque identity-provider subject (the Clerk `sub`), at most 64 chars. */
export class GroupMemberUserIdValueObject extends StringValueObject {
  constructor(value: string) {
    super(value, { minLength: 1, maxLength: 64, allowEmpty: false });
  }
}
