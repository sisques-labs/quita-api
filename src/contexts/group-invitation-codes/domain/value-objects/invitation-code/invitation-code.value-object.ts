import { InvitationCodeInvalidException } from '@contexts/group-invitation-codes/domain/exceptions/invitation-code-invalid.exception';
import { StringValueObject } from '@sisques-labs/nestjs-kit';

/** Crockford base32: no I, L, O or U, so codes survive being read aloud. */
export const INVITATION_CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export const INVITATION_CODE_LENGTH = 8;

const CROCKFORD_ALIASES: Record<string, string> = { I: '1', L: '1', O: '0' };

function normalize(value: string): string {
  const normalized = value
    .trim()
    .toUpperCase()
    .replace(/[ILO]/g, (char) => CROCKFORD_ALIASES[char]);

  const wellFormed =
    normalized.length === INVITATION_CODE_LENGTH &&
    [...normalized].every((char) => INVITATION_CODE_ALPHABET.includes(char));
  if (!wellFormed) {
    throw new InvitationCodeInvalidException();
  }
  return normalized;
}

/** Shareable 8-character code; malformed input is reported as invalid. */
export class InvitationCodeValueObject extends StringValueObject {
  constructor(value: string) {
    super(normalize(value), {
      minLength: INVITATION_CODE_LENGTH,
      maxLength: INVITATION_CODE_LENGTH,
      allowEmpty: false,
    });
  }
}
