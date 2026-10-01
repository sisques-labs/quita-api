import { ExpenseDateInFutureException } from '@contexts/expenses/domain/exceptions/expense-date-in-future.exception';
import { ExpenseDateInvalidException } from '@contexts/expenses/domain/exceptions/expense-date-invalid.exception';
import { ValueObject } from '@sisques-labs/nestjs-kit';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Date-only `YYYY-MM-DD` on which the expense was made. The constructor only
 * checks the format, so stored dates always hydrate; `create` additionally
 * enforces the "not in the future" rule against the caller-supplied `today`
 * (the core clock, in the configured time zone).
 */
export class ExpenseDateValueObject extends ValueObject<string> {
  private readonly _value: string;

  constructor(value: string) {
    super();
    this._value = value;
    this.validate();
  }

  static create(value: string, today: string): ExpenseDateValueObject {
    const date = new ExpenseDateValueObject(value);
    // Zero-padded ISO dates compare correctly as plain strings.
    if (date.value > today) {
      throw new ExpenseDateInFutureException(value, today);
    }
    return date;
  }

  get value(): string {
    return this._value;
  }

  protected validate(): void {
    if (!DATE_PATTERN.test(this._value) || !this.isCalendarDate()) {
      throw new ExpenseDateInvalidException(this._value);
    }
  }

  private isCalendarDate(): boolean {
    const parsed = new Date(`${this._value}T00:00:00Z`);
    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === this._value
    );
  }
}
