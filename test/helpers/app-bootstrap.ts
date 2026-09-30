import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { AppModule } from '../../src/app.module';
import { BaseExceptionFilter } from '../../src/core/filters/base-exception.filter';
import { CLOCK, ClockPort } from '../../src/core/clock/domain/clock.port';
import { ClerkTestSigner, createClerkTestSigner } from './clerk-test-signer';
import { bootstrapTestDataSource } from './test-data-source';

export interface E2EContext {
  app: INestApplication;
  http: () => ReturnType<typeof request>;
  dataSource: DataSource;
  /** Signs Clerk tokens the app under test accepts (local JWKS). */
  clerk: ClerkTestSigner;
  close: () => Promise<void>;
}

export interface E2EAppOptions {
  /** Replaces the system clock, e.g. to pin "today" for date-rule flows. */
  clock?: ClockPort;
}

export async function createE2EApp(
  options: E2EAppOptions = {},
): Promise<E2EContext> {
  await bootstrapTestDataSource();

  const clerk = await createClerkTestSigner();
  let builder = Test.createTestingModule({ imports: [AppModule] });
  for (const { token, value } of clerk.overrides) {
    builder = builder.overrideProvider(token).useValue(value);
  }
  if (options.clock) {
    builder = builder.overrideProvider(CLOCK).useValue(options.clock);
  }

  const moduleFixture = await builder.compile();

  const app = moduleFixture.createNestApplication();

  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new BaseExceptionFilter());

  await app.init();

  const dataSource = moduleFixture.get<DataSource>(getDataSourceToken());

  return {
    app,
    http: () => request(app.getHttpServer()),
    dataSource,
    clerk,
    close: async () => {
      await app.close();
    },
  };
}
