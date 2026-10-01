import { PaymentQueryableField } from '@contexts/payments/transport/graphql/enums/payment-queryable-field.enum';
import { registerEnumType } from '@nestjs/graphql';

registerEnumType(PaymentQueryableField, {
  name: 'PaymentQueryableFieldEnum',
  description: 'Payment fields that can be filtered or sorted by',
});
