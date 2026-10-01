export const CLOCK = Symbol('CLOCK');

export interface ClockPort {
  /** Current calendar date as `YYYY-MM-DD` in the configured time zone. */
  today(): string;
}
