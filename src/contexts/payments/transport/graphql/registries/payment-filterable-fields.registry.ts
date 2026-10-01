import { PaymentQueryableField } from '@contexts/payments/transport/graphql/enums/payment-queryable-field.enum';
import { FilterFieldRegistry } from '@sisques-labs/nestjs-kit';

/** Expected value shape per queryable field. */
export const paymentFilterableFields: FilterFieldRegistry<PaymentQueryableField> =
  {
    [PaymentQueryableField.ID]: { type: 'uuid' },
    [PaymentQueryableField.FROM_USER_ID]: { type: 'string' },
    [PaymentQueryableField.TO_USER_ID]: { type: 'string' },
    [PaymentQueryableField.PAID_ON]: { type: 'date' },
    [PaymentQueryableField.AMOUNT_CENTS]: { type: 'number' },
    [PaymentQueryableField.CREATED_AT]: { type: 'date' },
    [PaymentQueryableField.DELETED_AT]: { type: 'date' },
  };
