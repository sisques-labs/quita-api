import { ExpenseAmountValueObject } from '@contexts/expenses/domain/value-objects/expense-amount/expense-amount.value-object';

describe('ExpenseAmountValueObject', () => {
  it.each([1, 250, 2147483647])('accepts %i cents', (cents) => {
    expect(new ExpenseAmountValueObject(cents).value).toBe(cents);
  });

  it.each([0, -1, -250])('rejects the non-positive amount %i', (cents) => {
    expect(() => new ExpenseAmountValueObject(cents)).toThrow();
  });

  it.each([12.5, 0.99, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects the non-integer amount %s',
    (cents) => {
      expect(() => new ExpenseAmountValueObject(cents)).toThrow();
    },
  );

  it('rejects an amount above the integer column range', () => {
    expect(() => new ExpenseAmountValueObject(2147483648)).toThrow();
  });
});
