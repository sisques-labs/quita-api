import { ClockPort } from '@core/clock/domain/clock.port';

export class SystemClock implements ClockPort {
  private readonly formatter: Intl.DateTimeFormat;

  constructor(
    timeZone: string,
    private readonly now: () => Date = () => new Date(),
  ) {
    // The `en-CA` locale formats dates as `YYYY-MM-DD`.
    this.formatter = new Intl.DateTimeFormat('en-CA', { timeZone });
  }

  today(): string {
    return this.formatter.format(this.now());
  }
}
