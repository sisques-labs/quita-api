import {
  ExecutionContext,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

export interface AuthUser {
  userId: string;
}

export function getAuthUser(context: ExecutionContext): AuthUser {
  const { req } = GqlExecutionContext.create(context).getContext<{
    req: { authUser?: AuthUser };
  }>();

  if (!req.authUser) {
    throw new UnauthorizedException('No authenticated user on the request');
  }

  return req.authUser;
}

/** Current user set by `ClerkAuthGuard`; never read identity from input. */
export const AuthUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => getAuthUser(context),
);
