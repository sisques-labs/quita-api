import { InvitationCodeGeneratorPort } from '@contexts/group-invitation-codes/application/ports/invitation-code-generator.port';
import {
  INVITATION_CODE_ALPHABET,
  INVITATION_CODE_LENGTH,
} from '@contexts/group-invitation-codes/domain/value-objects/invitation-code/invitation-code.value-object';
import { Injectable } from '@nestjs/common';
import { randomInt } from 'node:crypto';

/** Draws each symbol with `crypto.randomInt`, which is uniform (no modulo bias). */
@Injectable()
export class CryptoInvitationCodeGenerator implements InvitationCodeGeneratorPort {
  generate(): string {
    return Array.from(
      { length: INVITATION_CODE_LENGTH },
      () =>
        INVITATION_CODE_ALPHABET[randomInt(INVITATION_CODE_ALPHABET.length)],
    ).join('');
  }
}
