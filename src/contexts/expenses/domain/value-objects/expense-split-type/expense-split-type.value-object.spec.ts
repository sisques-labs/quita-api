import { ExpenseSplitType } from '@contexts/expenses/domain/enums/expense-split-type.enum';
import { ExpenseSplitTypeValueObject } from '@contexts/expenses/domain/value-objects/expense-split-type/expense-split-type.value-object';

describe('ExpenseSplitTypeValueObject', () => {
  it('accepts EQUAL and OTHER_OWES_ALL', () => {
    expect(Object.values(ExpenseSplitType)).toEqual([
      'EQUAL',
      'OTHER_OWES_ALL',
    ]);
    expect(new ExpenseSplitTypeValueObject('EQUAL').value).toBe('EQUAL');
    expect(new ExpenseSplitTypeValueObject('OTHER_OWES_ALL').value).toBe(
      'OTHER_OWES_ALL',
    );
  });

  it.each(['PERCENT', 'equal', ''])('rejects "%s"', (value) => {
    expect(() => new ExpenseSplitTypeValueObject(value)).toThrow();
  });
});
