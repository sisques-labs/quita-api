import { INVITATION_CODE_ALPHABET } from '@contexts/group-invitation-codes/domain/constants/invitation-code-alphabet.constant';
import { INVITATION_CODE_LENGTH } from '@contexts/group-invitation-codes/domain/constants/invitation-code-length.constant';
import { InvitationCodeInvalidException } from '@contexts/group-invitation-codes/domain/exceptions/invitation-code-invalid.exception';
import { InvitationCodeValueObject } from '@contexts/group-invitation-codes/domain/value-objects/invitation-code/invitation-code.value-object';

describe('InvitationCodeValueObject', () => {
  it('accepts an 8-character Crockford base32 code', () => {
    expect(new InvitationCodeValueObject('7KQ2M9XZ').value).toBe('7KQ2M9XZ');
  });

  it('normalizes case and surrounding whitespace', () => {
    expect(new InvitationCodeValueObject('  7kq2m9xz ').value).toBe('7KQ2M9XZ');
  });

  it('maps the ambiguous characters I, L and O like Crockford does', () => {
    expect(new InvitationCodeValueObject('ILOilo12').value).toBe('11011012');
  });

  it('rejects a code with the wrong length', () => {
    expect(() => new InvitationCodeValueObject('7KQ2M9X')).toThrow(
      InvitationCodeInvalidException,
    );
    expect(() => new InvitationCodeValueObject('7KQ2M9XZ1')).toThrow(
      InvitationCodeInvalidException,
    );
  });

  it('rejects characters outside the alphabet', () => {
    expect(() => new InvitationCodeValueObject('7KQ2M9X-')).toThrow(
      InvitationCodeInvalidException,
    );
    expect(() => new InvitationCodeValueObject('7KQ2M9XU')).toThrow(
      InvitationCodeInvalidException,
    );
  });

  it('exposes an unambiguous alphabet of 32 symbols', () => {
    expect(INVITATION_CODE_ALPHABET).toHaveLength(32);
    expect(INVITATION_CODE_LENGTH).toBe(8);
    for (const ambiguous of ['I', 'L', 'O', 'U']) {
      expect(INVITATION_CODE_ALPHABET).not.toContain(ambiguous);
    }
  });
});
