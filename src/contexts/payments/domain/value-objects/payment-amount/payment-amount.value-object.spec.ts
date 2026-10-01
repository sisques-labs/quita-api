import { PaymentAmountValueObject } from '@contexts/payments/domain/value-objects/payment-amount/payment-amount.value-object';

describe('PaymentAmountValueObject', () => {
  it.each([1, 1000, 2147483647])('accepts %i cents', (cents) => {
    expect(new PaymentAmountValueObject(cents).value).toBe(cents);
  });

  it.each([0, -1, -1000])('rejects the non-positive amount %i', (cents) => {
    expect(() => new PaymentAmountValueObject(cents)).toThrow();
  });

  it.each([12.5, 0.99, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects the non-integer amount %s',
    (cents) => {
      expect(() => new PaymentAmountValueObject(cents)).toThrow();
    },
  );

  it('rejects an amount above the integer column range', () => {
    expect(() => new PaymentAmountValueObject(2147483648)).toThrow();
  });
});
