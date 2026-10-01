import { BaseException } from '@sisques-labs/nestjs-kit';

/** Thrown when a freshly generated code already exists; retrying with a new code resolves it. */
export class InvitationCodeCollisionException extends BaseException {
  constructor() {
    super('The generated invitation code is already in use');
  }
}
