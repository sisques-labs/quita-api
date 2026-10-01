import { vi } from 'vitest';

import { clerkConfig } from '@core/config/clerk.config';

describe('clerkConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('leaves everything unset when no CLERK_* variable is present', () => {
    delete process.env.CLERK_JWKS_URL;
    delete process.env.CLERK_ISSUER;
    delete process.env.CLERK_AUTHORIZED_PARTIES;

    expect(clerkConfig()).toEqual({
      jwksUrl: undefined,
      issuer: undefined,
      authorizedParties: [],
    });
  });

  it('reads the Clerk settings and splits authorized parties', () => {
    process.env.CLERK_JWKS_URL = 'https://clerk.example.com/jwks.json';
    process.env.CLERK_ISSUER = 'https://clerk.example.com';
    process.env.CLERK_AUTHORIZED_PARTIES =
      'https://a.example.com, https://b.example.com ,';

    expect(clerkConfig()).toEqual({
      jwksUrl: 'https://clerk.example.com/jwks.json',
      issuer: 'https://clerk.example.com',
      authorizedParties: ['https://a.example.com', 'https://b.example.com'],
    });
  });
});
