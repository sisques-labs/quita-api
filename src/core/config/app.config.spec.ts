import { vi } from 'vitest';

import { appConfig } from '@core/config/app.config';

describe('appConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('falls back to defaults when env vars are unset', () => {
    delete process.env.SERVICE_NAME;
    delete process.env.NODE_ENV;
    delete process.env.FRONTEND_URL;
    delete process.env.CORS_ORIGINS;

    const config = appConfig();

    expect(config.name).toBe('quita-api');
    expect(config.nodeEnv).toBe('development');
    expect(config.frontendUrl).toBe('http://localhost:3001');
    expect(config.corsOrigins).toEqual(['http://localhost:3001']);
  });

  it('defaults the timezone to Europe/Madrid', () => {
    delete process.env.APP_TIMEZONE;

    expect(appConfig().timezone).toBe('Europe/Madrid');
  });

  it('reads the timezone from APP_TIMEZONE', () => {
    process.env.APP_TIMEZONE = ' America/New_York ';

    expect(appConfig().timezone).toBe('America/New_York');
  });

  it('reads overrides from the environment', () => {
    process.env.SERVICE_NAME = ' orders-service ';
    process.env.NODE_ENV = 'production';
    process.env.FRONTEND_URL = 'https://app.example.com/';
    process.env.CORS_ORIGINS = 'https://app.example.com';

    const config = appConfig();

    expect(config.name).toBe('orders-service');
    expect(config.nodeEnv).toBe('production');
    expect(config.frontendUrl).toBe('https://app.example.com');
    expect(config.corsOrigins).toEqual(['https://app.example.com']);
  });
});
