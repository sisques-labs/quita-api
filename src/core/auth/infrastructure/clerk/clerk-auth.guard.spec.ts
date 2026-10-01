import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import {
  SignJWT,
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  type JWTVerifyGetKey,
} from 'jose';

import { ClerkAuthGuard } from '@core/auth/infrastructure/clerk/clerk-auth.guard';
import { IdentityUserIdResolver } from '@core/auth/infrastructure/clerk/user-id-resolver';

const ISSUER = 'https://clerk.test';
const KID = 'test-key';

type Request = {
  headers: Record<string, string | undefined>;
  authUser?: unknown;
};

// Unit specs cannot import from test/ (alias-only imports); the shared signer
// used by the e2e/integration bootstraps lives in test/helpers.
interface TestSigner {
  jwks: JWTVerifyGetKey;
  signToken: (claims?: {
    sub?: string;
    iss?: string;
    exp?: string | number;
    azp?: string;
  }) => Promise<string>;
}

async function createClerkTestSigner(): Promise<TestSigner> {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const jwk = { ...(await exportJWK(publicKey)), kid: KID, alg: 'RS256' };

  return {
    jwks: createLocalJWKSet({ keys: [jwk] }),
    signToken: ({ sub = 'user_123', iss = ISSUER, exp = '5m', azp } = {}) =>
      new SignJWT(azp ? { azp } : {})
        .setProtectedHeader({ alg: 'RS256', kid: KID })
        .setSubject(sub)
        .setIssuer(iss)
        .setIssuedAt(Math.floor(Date.now() / 1000) - 120)
        .setExpirationTime(exp)
        .sign(privateKey),
  };
}

function contextFor(request: Request): ExecutionContext {
  const context = {} as ExecutionContext;
  vi.spyOn(GqlExecutionContext, 'create').mockReturnValue({
    getContext: () => ({ req: request }),
  } as unknown as GqlExecutionContext);
  return context;
}

describe('ClerkAuthGuard', () => {
  let jwks: JWTVerifyGetKey;
  let signer: TestSigner;

  const guard = (options: { authorizedParties?: string[] } = {}) =>
    new ClerkAuthGuard(
      jwks,
      { issuer: ISSUER, authorizedParties: options.authorizedParties ?? [] },
      new IdentityUserIdResolver(),
    );

  beforeAll(async () => {
    signer = await createClerkTestSigner();
    jwks = signer.jwks;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('accepts a valid token and exposes the subject as the current user', async () => {
    const request: Request = {
      headers: { authorization: `Bearer ${await signer.signToken()}` },
    };

    await expect(guard().canActivate(contextFor(request))).resolves.toBe(true);
    expect(request.authUser).toEqual({ userId: 'user_123' });
  });

  it('resolves a different subject to its own user id', async () => {
    const request: Request = {
      headers: {
        authorization: `Bearer ${await signer.signToken({ sub: 'user_456' })}`,
      },
    };

    await guard().canActivate(contextFor(request));

    expect(request.authUser).toEqual({ userId: 'user_456' });
  });

  it('rejects a missing Authorization header', async () => {
    await expect(
      guard().canActivate(contextFor({ headers: {} })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a non-bearer Authorization header', async () => {
    await expect(
      guard().canActivate(
        contextFor({ headers: { authorization: 'Basic abc' } }),
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a token signed with another key', async () => {
    const other = await createClerkTestSigner();
    const token = await other.signToken();

    await expect(
      guard().canActivate(
        contextFor({ headers: { authorization: `Bearer ${token}` } }),
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a token from the wrong issuer', async () => {
    const token = await signer.signToken({ iss: 'https://evil.test' });

    await expect(
      guard().canActivate(
        contextFor({ headers: { authorization: `Bearer ${token}` } }),
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects an expired token', async () => {
    const token = await signer.signToken({
      exp: Math.floor(Date.now() / 1000) - 60,
    });

    await expect(
      guard().canActivate(
        contextFor({ headers: { authorization: `Bearer ${token}` } }),
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a token whose azp is not an authorized party', async () => {
    const token = await signer.signToken({ azp: 'https://evil.test' });

    await expect(
      guard({ authorizedParties: ['https://app.test'] }).canActivate(
        contextFor({ headers: { authorization: `Bearer ${token}` } }),
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('accepts a token whose azp is an authorized party', async () => {
    const token = await signer.signToken({ azp: 'https://app.test' });

    await expect(
      guard({ authorizedParties: ['https://app.test'] }).canActivate(
        contextFor({ headers: { authorization: `Bearer ${token}` } }),
      ),
    ).resolves.toBe(true);
  });

  it('rejects every request when Clerk is not configured', async () => {
    const unconfigured = new ClerkAuthGuard(
      undefined,
      { issuer: undefined, authorizedParties: [] },
      new IdentityUserIdResolver(),
    );

    await expect(
      unconfigured.canActivate(
        contextFor({
          headers: { authorization: `Bearer ${await signer.signToken()}` },
        }),
      ),
    ).rejects.toThrow(UnauthorizedException);
  });
});
