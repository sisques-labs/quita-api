import { PaymentObject } from '@contexts/payments/transport/graphql/objects/payment.object';
import { Field, ObjectType } from '@nestjs/graphql';
import { BasePaginatedResultDto } from '@sisques-labs/nestjs-kit/graphql';

@ObjectType('PaginatedPaymentResult')
export class PaginatedPaymentResultObject extends BasePaginatedResultDto {
  @Field(() => [PaymentObject])
  items!: PaymentObject[];
}
