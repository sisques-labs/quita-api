import { StringValueObject } from '@sisques-labs/nestjs-kit';

/** Opaque identity-provider subject (the Clerk `sub`) of the creator. */
export class GroupCreatedByValueObject extends StringValueObject {
  constructor(value: string) {
    super(value, { minLength: 1, maxLength: 64, allowEmpty: false });
  }
}
