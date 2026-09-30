import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

import { getAuthUser } from '@core/auth/infrastructure/clerk/auth-user.decorator';

function contextWith(req: unknown): ExecutionContext {
  vi.spyOn(GqlExecutionContext, 'create').mockReturnValue({
    getContext: () => ({ req }),
  } as unknown as GqlExecutionContext);
  return {} as ExecutionContext;
}

describe('getAuthUser', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the user attached by the guard', () => {
    const context = contextWith({ authUser: { userId: 'user_123' } });

    expect(getAuthUser(context)).toEqual({ userId: 'user_123' });
  });

  it('throws when no user was attached (guard not applied)', () => {
    expect(() => getAuthUser(contextWith({}))).toThrow(UnauthorizedException);
  });
});
