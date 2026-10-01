import {
  SignJWT,
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  type JWTVerifyGetKey,
} from 'jose';

import {
  CLERK_AUTH_OPTIONS,
  CLERK_JWKS,
} from '../../src/core/auth/infrastructure/clerk/clerk-auth.guard';

export const TEST_CLERK_ISSUER = 'https://clerk.test';
const TEST_KID = 'test-key';

export interface ClerkTestSigner {
  jwks: JWTVerifyGetKey;
  signToken: (claims?: SignTokenClaims) => Promise<string>;
  /** Providers to pass to `overrideProvider(...).useValue(...)`. */
  overrides: Array<{ token: symbol; value: unknown }>;
}

export interface SignTokenClaims {
  sub?: string;
  iss?: string;
  /** Anything `jose` accepts: `'5m'`, or an absolute epoch-seconds number. */
  exp?: string | number;
  azp?: string;
}

/**
 * Signs Clerk-shaped RS256 tokens with a throwaway key and exposes the
 * matching local JWKS, so guards can be exercised without the network.
 */
export async function createClerkTestSigner(
  kid: string = TEST_KID,
): Promise<ClerkTestSigner> {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const jwk = { ...(await exportJWK(publicKey)), kid, alg: 'RS256' };
  const jwks = createLocalJWKSet({ keys: [jwk] });

  return {
    jwks,
    signToken: ({
      sub = 'user_123',
      iss = TEST_CLERK_ISSUER,
      exp = '5m',
      azp,
    }: SignTokenClaims = {}) =>
      new SignJWT(azp ? { azp } : {})
        .setProtectedHeader({ alg: 'RS256', kid })
        .setSubject(sub)
        .setIssuer(iss)
        .setIssuedAt(Math.floor(Date.now() / 1000) - 120)
        .setExpirationTime(exp)
        .sign(privateKey),
    overrides: [
      { token: CLERK_JWKS, value: jwks },
      {
        token: CLERK_AUTH_OPTIONS,
        value: { issuer: TEST_CLERK_ISSUER, authorizedParties: [] },
      },
    ],
  };
}
