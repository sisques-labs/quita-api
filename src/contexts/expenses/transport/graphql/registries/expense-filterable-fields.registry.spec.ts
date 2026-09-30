import { ExpenseCategory } from '@contexts/expenses/domain/enums/expense-category.enum';
import { ExpenseSplitType } from '@contexts/expenses/domain/enums/expense-split-type.enum';
import { ExpenseQueryableField } from '@contexts/expenses/transport/graphql/enums/expense-queryable-field.enum';
import { expenseFilterableFields } from '@contexts/expenses/transport/graphql/registries/expense-filterable-fields.registry';
import { BadRequestException } from '@nestjs/common';
import { FilterOperator } from '@sisques-labs/nestjs-kit';
import { FilterValidationPipe } from '@sisques-labs/nestjs-kit/graphql';

describe('expenseFilterableFields', () => {
  it('describes every queryable field', () => {
    for (const field of Object.values(ExpenseQueryableField)) {
      expect(expenseFilterableFields[field]).toBeDefined();
    }
    expect(Object.keys(expenseFilterableFields).sort()).toEqual(
      Object.values(ExpenseQueryableField).sort(),
    );
  });

  it('exposes only fields that are real columns, never the group scope', () => {
    expect(Object.values(ExpenseQueryableField).sort()).toEqual([
      'amountCents',
      'category',
      'createdAt',
      'deletedAt',
      'id',
      'paidBy',
      'spentOn',
      'splitType',
    ]);
  });

  it('backs enum columns with the domain enums', () => {
    expect(expenseFilterableFields[ExpenseQueryableField.CATEGORY]).toEqual({
      type: 'enum',
      enum: ExpenseCategory,
    });
    expect(expenseFilterableFields[ExpenseQueryableField.SPLIT_TYPE]).toEqual({
      type: 'enum',
      enum: ExpenseSplitType,
    });
  });

  describe('with FilterValidationPipe', () => {
    const pipe = new FilterValidationPipe(expenseFilterableFields);

    it('accepts a member of the category enum', () => {
      const input = {
        filters: [
          {
            field: ExpenseQueryableField.CATEGORY,
            operator: FilterOperator.EQUALS,
            value: 'food',
          },
        ],
      };

      expect(pipe.transform(input)).toBe(input);
    });

    it('rejects a value outside the category enum', () => {
      expect(() =>
        pipe.transform({
          filters: [
            {
              field: ExpenseQueryableField.CATEGORY,
              operator: FilterOperator.EQUALS,
              value: 'pets',
            },
          ],
        }),
      ).toThrow(BadRequestException);
    });

    it('rejects a non-numeric amount', () => {
      expect(() =>
        pipe.transform({
          filters: [
            {
              field: ExpenseQueryableField.AMOUNT_CENTS,
              operator: FilterOperator.GREATER_THAN,
              value: 'many',
            },
          ],
        }),
      ).toThrow(BadRequestException);
    });

    it('rejects a field outside the whitelist, such as the group id', () => {
      expect(() =>
        pipe.transform({
          filters: [
            {
              field: 'groupId' as ExpenseQueryableField,
              operator: FilterOperator.EQUALS,
              value: 'x',
            },
          ],
        }),
      ).toThrow('Unknown filter field: "groupId"');
    });
  });
});
