import { PaymentDateInFutureException } from '@contexts/payments/domain/exceptions/payment-date-in-future.exception';
import { PaymentDateInvalidException } from '@contexts/payments/domain/exceptions/payment-date-invalid.exception';
import { ValueObject } from '@sisques-labs/nestjs-kit';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Date-only `YYYY-MM-DD` on which the payment was made. The constructor only
 * checks the format, so stored dates always hydrate; `create` additionally
 * enforces the "not in the future" rule against the caller-supplied `today`
 * (the core clock, in the configured time zone).
 */
export class PaymentDateValueObject extends ValueObject<string> {
  private readonly _value: string;

  constructor(value: string) {
    super();
    this._value = value;
    this.validate();
  }

  static create(value: string, today: string): PaymentDateValueObject {
    const date = new PaymentDateValueObject(value);
    // Zero-padded ISO dates compare correctly as plain strings.
    if (date.value > today) {
      throw new PaymentDateInFutureException(value, today);
    }
    return date;
  }

  get value(): string {
    return this._value;
  }

  protected validate(): void {
    if (!DATE_PATTERN.test(this._value) || !this.isCalendarDate()) {
      throw new PaymentDateInvalidException(this._value);
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
