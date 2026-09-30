import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet } from 'jose';

import {
  CLERK_AUTH_OPTIONS,
  CLERK_JWKS,
  ClerkAuthGuard,
  ClerkAuthOptions,
} from '@core/auth/infrastructure/clerk/clerk-auth.guard';
import {
  IdentityUserIdResolver,
  USER_ID_RESOLVER,
} from '@core/auth/infrastructure/clerk/user-id-resolver';

@Global()
@Module({
  providers: [
    {
      provide: CLERK_AUTH_OPTIONS,
      inject: [ConfigService],
      useFactory: (config: ConfigService): ClerkAuthOptions => ({
        issuer: config.get<string>('clerk.issuer'),
        authorizedParties: config.get<string[]>('clerk.authorizedParties', []),
      }),
    },
    {
      provide: CLERK_JWKS,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const jwksUrl = config.get<string>('clerk.jwksUrl');

        return jwksUrl ? createRemoteJWKSet(new URL(jwksUrl)) : undefined;
      },
    },
    { provide: USER_ID_RESOLVER, useClass: IdentityUserIdResolver },
    ClerkAuthGuard,
  ],
  exports: [ClerkAuthGuard, USER_ID_RESOLVER],
})
export class ClerkAuthModule {}
