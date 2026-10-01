import { IdentityUserIdResolver } from '@core/auth/infrastructure/clerk/user-id-resolver';

describe('IdentityUserIdResolver', () => {
  it('maps the Clerk subject to the same internal id', async () => {
    const resolver = new IdentityUserIdResolver();

    await expect(resolver.resolve('user_abc')).resolves.toBe('user_abc');
    await expect(resolver.resolve('user_xyz')).resolves.toBe('user_xyz');
  });
});
