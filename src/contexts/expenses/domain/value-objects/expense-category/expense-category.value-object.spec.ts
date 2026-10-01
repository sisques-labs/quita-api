import { ExpenseCategory } from '@contexts/expenses/domain/enums/expense-category.enum';
import { ExpenseCategoryValueObject } from '@contexts/expenses/domain/value-objects/expense-category/expense-category.value-object';

describe('ExpenseCategoryValueObject', () => {
  it('accepts exactly the nine fixed categories', () => {
    const values = [
      'food',
      'home',
      'transport',
      'leisure',
      'health',
      'travel',
      'shopping',
      'bills',
      'other',
    ];
    expect(Object.values(ExpenseCategory)).toEqual(values);
    for (const value of values) {
      expect(new ExpenseCategoryValueObject(value).value).toBe(value);
    }
  });

  it.each(['pets', 'FOOD', ''])('rejects "%s"', (value) => {
    expect(() => new ExpenseCategoryValueObject(value)).toThrow();
  });
});
