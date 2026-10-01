import { INVITATION_CODE_ALPHABET } from '@contexts/group-invitation-codes/domain/constants/invitation-code-alphabet.constant';
import { INVITATION_CODE_LENGTH } from '@contexts/group-invitation-codes/domain/constants/invitation-code-length.constant';
import { InvitationCodeValueObject } from '@contexts/group-invitation-codes/domain/value-objects/invitation-code/invitation-code.value-object';
import { CryptoInvitationCodeGenerator } from '@contexts/group-invitation-codes/infrastructure/generators/crypto-invitation-code.generator';

describe('CryptoInvitationCodeGenerator', () => {
  const generator = new CryptoInvitationCodeGenerator();

  it('generates codes of the right length using only the alphabet', () => {
    for (let i = 0; i < 200; i++) {
      const code = generator.generate();
      expect(code).toHaveLength(INVITATION_CODE_LENGTH);
      for (const char of code) {
        expect(INVITATION_CODE_ALPHABET).toContain(char);
      }
    }
  });

  it('generates codes the value object accepts unchanged', () => {
    const code = generator.generate();
    expect(new InvitationCodeValueObject(code).value).toBe(code);
  });

  it('does not repeat itself', () => {
    const codes = new Set(
      Array.from({ length: 500 }, () => generator.generate()),
    );
    expect(codes.size).toBe(500);
  });

  it('eventually uses every symbol of the alphabet', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 400; i++) {
      for (const char of generator.generate()) {
        seen.add(char);
      }
    }
    expect(seen.size).toBe(INVITATION_CODE_ALPHABET.length);
  });
});
