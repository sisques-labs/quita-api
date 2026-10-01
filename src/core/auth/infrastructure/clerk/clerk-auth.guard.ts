import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { JWTVerifyGetKey, jwtVerify } from 'jose';

import { AuthUser } from '@core/auth/infrastructure/clerk/auth-user.decorator';
import {
  USER_ID_RESOLVER,
  UserIdResolver,
} from '@core/auth/infrastructure/clerk/user-id-resolver';

export const CLERK_JWKS = Symbol('CLERK_JWKS');
export const CLERK_AUTH_OPTIONS = Symbol('CLERK_AUTH_OPTIONS');

export interface ClerkAuthOptions {
  issuer: string | undefined;
  authorizedParties: string[];
}

const BEARER_PREFIX = 'Bearer ';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(
    @Inject(CLERK_JWKS) private readonly jwks: JWTVerifyGetKey | undefined,
    @Inject(CLERK_AUTH_OPTIONS) private readonly options: ClerkAuthOptions,
    @Inject(USER_ID_RESOLVER) private readonly userIdResolver: UserIdResolver,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { req } = GqlExecutionContext.create(context).getContext<{
      req: {
        headers: Record<string, string | undefined>;
        authUser?: AuthUser;
      };
    }>();

    const token = this.extractBearerToken(req.headers.authorization);
    const subject = await this.verify(token);

    req.authUser = { userId: await this.userIdResolver.resolve(subject) };

    return true;
  }

  private extractBearerToken(header: string | undefined): string {
    if (!header?.startsWith(BEARER_PREFIX)) {
      throw new UnauthorizedException('Missing bearer token');
    }

    return header.slice(BEARER_PREFIX.length).trim();
  }

  private async verify(token: string): Promise<string> {
    const { issuer, authorizedParties } = this.options;

    if (!this.jwks || !issuer) {
      throw new UnauthorizedException('Clerk authentication is not configured');
    }

    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer,
        algorithms: ['RS256'],
      });

      const authorizedParty = payload.azp;
      if (
        authorizedParties.length > 0 &&
        typeof authorizedParty === 'string' &&
        !authorizedParties.includes(authorizedParty)
      ) {
        throw new Error('Unauthorized party');
      }

      if (!payload.sub) {
        throw new Error('Missing subject');
      }

      return payload.sub;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
