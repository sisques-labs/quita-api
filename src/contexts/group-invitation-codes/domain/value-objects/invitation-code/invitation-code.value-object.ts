import { CROCKFORD_ALIASES } from '@contexts/group-invitation-codes/domain/constants/crockford-aliases.constant';
import { INVITATION_CODE_ALPHABET } from '@contexts/group-invitation-codes/domain/constants/invitation-code-alphabet.constant';
import { INVITATION_CODE_LENGTH } from '@contexts/group-invitation-codes/domain/constants/invitation-code-length.constant';
import { InvitationCodeInvalidException } from '@contexts/group-invitation-codes/domain/exceptions/invitation-code-invalid.exception';
import { StringValueObject } from '@sisques-labs/nestjs-kit';

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
