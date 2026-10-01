import { BaseException } from '@sisques-labs/nestjs-kit';

/** Thrown for codes that are malformed, unknown or already revoked. */
export class InvitationCodeInvalidException extends BaseException {
  constructor() {
    super('The invitation code is invalid');
  }
}
