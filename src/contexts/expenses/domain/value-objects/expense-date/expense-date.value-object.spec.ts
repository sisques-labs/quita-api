import { ExpenseDateInFutureException } from '@contexts/expenses/domain/exceptions/expense-date-in-future.exception';
import { ExpenseDateInvalidException } from '@contexts/expenses/domain/exceptions/expense-date-invalid.exception';
import { ExpenseDateValueObject } from '@contexts/expenses/domain/value-objects/expense-date/expense-date.value-object';

const TODAY = '2026-09-30';

describe('ExpenseDateValueObject', () => {
  describe('create', () => {
    it('accepts today', () => {
      expect(ExpenseDateValueObject.create(TODAY, TODAY).value).toBe(TODAY);
    });

    it('accepts a past date, including across a month boundary', () => {
      expect(ExpenseDateValueObject.create('2026-09-29', TODAY).value).toBe(
        '2026-09-29',
      );
      expect(ExpenseDateValueObject.create('2025-12-31', TODAY).value).toBe(
        '2025-12-31',
      );
    });

    it('rejects tomorrow', () => {
      expect(() => ExpenseDateValueObject.create('2026-10-01', TODAY)).toThrow(
        ExpenseDateInFutureException,
      );
    });

    it('rejects a far future date', () => {
      expect(() => ExpenseDateValueObject.create('2030-01-01', TODAY)).toThrow(
        ExpenseDateInFutureException,
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
      expect(() => ExpenseDateValueObject.create(value, TODAY)).toThrow(
        ExpenseDateInvalidException,
      );
    });
  });

  describe('constructor (hydration)', () => {
    it('validates the format only, so stored dates always hydrate', () => {
      expect(new ExpenseDateValueObject('2099-01-01').value).toBe('2099-01-01');
      expect(() => new ExpenseDateValueObject('2026-02-30')).toThrow(
        ExpenseDateInvalidException,
      );
    });
  });
});
