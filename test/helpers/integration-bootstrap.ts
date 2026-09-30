import { DynamicModule, Provider, Type } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { DataSource } from 'typeorm';
import { SharedGraphQLModule } from '@sisques-labs/nestjs-kit/graphql';

import { ClerkAuthModule } from '../../src/core/auth/infrastructure/clerk/clerk-auth.module';
import { ClockModule } from '../../src/core/clock/clock.module';
import { appConfig } from '../../src/core/config/app.config';
import { clerkConfig } from '../../src/core/config/clerk.config';
import { ClerkTestSigner, createClerkTestSigner } from './clerk-test-signer';
import { bootstrapTestDataSource } from './test-data-source';

const DB_HOST = process.env.DATABASE_HOST ?? 'localhost';
const DB_PORT = parseInt(process.env.DATABASE_PORT ?? '5433', 10);
const DB_DATABASE = process.env.DATABASE_DATABASE ?? 'quita_api_test';
const DB_USERNAME = process.env.DATABASE_USERNAME ?? 'postgres';
const DB_PASSWORD = process.env.DATABASE_PASSWORD ?? 'postgres';

export interface IntegrationModuleOptions {
  imports: Array<Type<unknown> | DynamicModule>;
  providers?: Provider[];
}

export interface IntegrationContext {
  module: TestingModule;
  dataSource: DataSource;
  /** Signs Clerk tokens accepted by the slim module's `ClerkAuthGuard`. */
  clerk: ClerkTestSigner;
  close: () => Promise<void>;
}

/**
 * Bootstraps a slim TestingModule for integration specs — real Postgres, no
 * HTTP layer. Pass the bounded-context module(s) under test via `imports`.
 */
export async function createIntegrationModule(
  options: IntegrationModuleOptions,
): Promise<IntegrationContext> {
  await bootstrapTestDataSource();

  const clerk = await createClerkTestSigner();
  let builder = Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        load: [appConfig, clerkConfig],
      }),
      TypeOrmModule.forRoot({
        type: 'postgres',
        host: DB_HOST,
        port: DB_PORT,
        database: DB_DATABASE,
        username: DB_USERNAME,
        password: DB_PASSWORD,
        // Entities are auto-loaded from whatever bounded-context module the test
        // imports (each registers its entity via TypeOrmModule.forFeature), so
        // adding a new context never requires editing this list. Mirrors the
        // production AppModule (autoLoadEntities: true).
        autoLoadEntities: true,
        synchronize: false,
        logging: false,
      }),
      CqrsModule.forRoot(),
      SharedGraphQLModule,
      ClockModule,
      ClerkAuthModule,
      ...options.imports,
    ],
    providers: options.providers ?? [],
  });
  for (const { token, value } of clerk.overrides) {
    builder = builder.overrideProvider(token).useValue(value);
  }
  const moduleFixture = await builder.compile();
  // CQRS registers command/query/event handlers on application bootstrap.
  await moduleFixture.init();

  const dataSource = moduleFixture.get<DataSource>(getDataSourceToken());

  return {
    module: moduleFixture,
    dataSource,
    clerk,
    close: async () => {
      await moduleFixture.close();
    },
  };
}
