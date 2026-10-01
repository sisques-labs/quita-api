import { registerAs } from '@nestjs/config';

/**
 * Clerk token verification settings. Everything stays `undefined`/empty when
 * unset so the service still boots without Clerk; `ClerkAuthGuard` rejects
 * every request as unauthenticated until `jwksUrl` and `issuer` are set.
 */
export const clerkConfig = registerAs('clerk', () => ({
  jwksUrl: process.env.CLERK_JWKS_URL?.trim() || undefined,
  issuer: process.env.CLERK_ISSUER?.trim() || undefined,
  authorizedParties: (process.env.CLERK_AUTHORIZED_PARTIES ?? '')
    .split(',')
    .map((party) => party.trim())
    .filter((party) => party.length > 0),
}));
