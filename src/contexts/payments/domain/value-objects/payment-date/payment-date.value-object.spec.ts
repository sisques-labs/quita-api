import { PaymentDateInFutureException } from '@contexts/payments/domain/exceptions/payment-date-in-future.exception';
import { PaymentDateInvalidException } from '@contexts/payments/domain/exceptions/payment-date-invalid.exception';
import { PaymentDateValueObject } from '@contexts/payments/domain/value-objects/payment-date/payment-date.value-object';

const TODAY = '2026-09-30';

describe('PaymentDateValueObject', () => {
  describe('create', () => {
    it('accepts today', () => {
      expect(PaymentDateValueObject.create(TODAY, TODAY).value).toBe(TODAY);
    });

    it('accepts a past date, including across a month boundary', () => {
      expect(PaymentDateValueObject.create('2026-09-29', TODAY).value).toBe(
        '2026-09-29',
      );
      expect(PaymentDateValueObject.create('2025-12-31', TODAY).value).toBe(
        '2025-12-31',
      );
    });

    it('rejects tomorrow', () => {
      expect(() => PaymentDateValueObject.create('2026-10-01', TODAY)).toThrow(
        PaymentDateInFutureException,
      );
    });

    it('rejects a far future date', () => {
      expect(() => PaymentDateValueObject.create('2030-01-01', TODAY)).toThrow(
        PaymentDateInFutureException,
      );
    });

    it.each([
      '30/09/2026',
      '2026-9-3',
      '2026-09-30T10:00:00Z',
      '2026-13-01',
      '2026-02-30',
      '',
      'yesterday',
    ])('rejects the malformed date "%s"', (value) => {
      expect(() => PaymentDateValueObject.create(value, TODAY)).toThrow(
        PaymentDateInvalidException,
      );
    });
  });

  describe('constructor (hydration)', () => {
    it('validates the format only, so stored dates always hydrate', () => {
      expect(new PaymentDateValueObject('2099-01-01').value).toBe('2099-01-01');
      expect(() => new PaymentDateValueObject('2026-02-30')).toThrow(
        PaymentDateInvalidException,
      );
    });
  });
});
