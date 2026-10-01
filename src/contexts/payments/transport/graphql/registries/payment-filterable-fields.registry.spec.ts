import { PaymentQueryableField } from '@contexts/payments/transport/graphql/enums/payment-queryable-field.enum';
import { paymentFilterableFields } from '@contexts/payments/transport/graphql/registries/payment-filterable-fields.registry';
import { BadRequestException } from '@nestjs/common';
import { FilterOperator } from '@sisques-labs/nestjs-kit';
import { FilterValidationPipe } from '@sisques-labs/nestjs-kit/graphql';

describe('paymentFilterableFields', () => {
  it('describes every queryable field and nothing else', () => {
    expect(Object.keys(paymentFilterableFields).sort()).toEqual(
      Object.values(PaymentQueryableField).sort(),
    );
  });

  it('exposes only real columns, never the group scope', () => {
    expect(Object.values(PaymentQueryableField).sort()).toEqual([
      'amountCents',
      'createdAt',
      'deletedAt',
      'fromUserId',
      'id',
      'paidOn',
      'toUserId',
    ]);
  });

  describe('with FilterValidationPipe', () => {
    const pipe = new FilterValidationPipe(paymentFilterableFields);

    it.each([FilterOperator.IS_NULL, FilterOperator.IS_NOT_NULL])(
      'accepts the %s operator without a value',
      (operator) => {
        const input = {
          filters: [{ field: PaymentQueryableField.DELETED_AT, operator }],
        };

        expect(pipe.transform(input)).toBe(input);
      },
    );

    it('still rejects a null operator on a field outside the whitelist', () => {
      expect(() =>
        pipe.transform({
          filters: [{ field: 'groupId', operator: FilterOperator.IS_NULL }],
        }),
      ).toThrow('Unknown filter field: "groupId"');
    });

    it('accepts a well-typed filter', () => {
      const input = {
        filters: [
          {
            field: PaymentQueryableField.AMOUNT_CENTS,
            operator: FilterOperator.GREATER_THAN,
            value: 100,
          },
        ],
      };

      expect(pipe.transform(input)).toBe(input);
    });

    it('rejects a non-numeric amount', () => {
      expect(() =>
        pipe.transform({
          filters: [
            {
              field: PaymentQueryableField.AMOUNT_CENTS,
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
              field: 'groupId' as PaymentQueryableField,
              operator: FilterOperator.EQUALS,
              value: 'x',
            },
          ],
        }),
      ).toThrow('Unknown filter field: "groupId"');
    });
  });
});
