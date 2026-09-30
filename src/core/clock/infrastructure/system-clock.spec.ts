import { SystemClock } from '@core/clock/infrastructure/system-clock';

describe('SystemClock', () => {
  const madridClock = (iso: string) =>
    new SystemClock('Europe/Madrid', () => new Date(iso));

  it('returns the next Madrid day after 00:00 CET (winter)', () => {
    expect(madridClock('2026-01-01T23:30:00Z').today()).toBe('2026-01-02');
  });

  it('returns the next Madrid day after 00:00 CEST (summer)', () => {
    expect(madridClock('2026-07-01T22:30:00Z').today()).toBe('2026-07-02');
  });

  it('keeps the same Madrid day just before midnight CET', () => {
    expect(madridClock('2026-01-01T22:59:00Z').today()).toBe('2026-01-01');
  });

  it('honours a different timezone', () => {
    const clock = new SystemClock(
      'America/New_York',
      () => new Date('2026-01-01T03:00:00Z'),
    );

    expect(clock.today()).toBe('2025-12-31');
  });

  it('uses the real clock when no now function is injected', () => {
    expect(new SystemClock('UTC').today()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
