import { PaymentQueryableField } from '@contexts/payments/transport/graphql/enums/payment-queryable-field.enum';
import { InputType } from '@nestjs/graphql';
import { createSortInput } from '@sisques-labs/nestjs-kit/graphql';

@InputType('PaymentSortInput')
export class PaymentSortInput extends createSortInput(
  PaymentQueryableField,
  'Payment',
) {}
