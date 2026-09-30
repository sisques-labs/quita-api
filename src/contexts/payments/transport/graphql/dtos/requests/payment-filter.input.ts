import { PaymentQueryableField } from '@contexts/payments/transport/graphql/enums/payment-queryable-field.enum';
import { InputType } from '@nestjs/graphql';
import { createFilterInput } from '@sisques-labs/nestjs-kit/graphql';

@InputType('PaymentFilterInput')
export class PaymentFilterInput extends createFilterInput(
  PaymentQueryableField,
  'Payment',
) {}
