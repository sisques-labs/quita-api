import { StringValueObject } from '@sisques-labs/nestjs-kit';

/** Opaque identity-provider subject (the Clerk `sub`) of a user. */
export class PaymentUserIdValueObject extends StringValueObject {
  constructor(value: string) {
    super(value, { minLength: 1, maxLength: 64, allowEmpty: false });
  }
}
