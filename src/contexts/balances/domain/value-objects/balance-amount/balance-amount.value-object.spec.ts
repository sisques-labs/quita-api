import { BalanceAmountValueObject } from '@contexts/balances/domain/value-objects/balance-amount/balance-amount.value-object';

describe('BalanceAmountValueObject', () => {
  it.each([1, 1001, 2147483647])('accepts %i cents', (cents) => {
    expect(new BalanceAmountValueObject(cents).value).toBe(cents);
  });

  it.each([0, -1, -500])('rejects the non-positive amount %i', (cents) => {
    expect(() => new BalanceAmountValueObject(cents)).toThrow();
  });

  it.each([10.01, 0.5, Number.NaN])(
    'rejects the non-integer amount %s',
    (cents) => {
      expect(() => new BalanceAmountValueObject(cents)).toThrow();
    },
  );

  it('rejects an amount above the integer column range', () => {
    expect(() => new BalanceAmountValueObject(2147483648)).toThrow();
  });
});
